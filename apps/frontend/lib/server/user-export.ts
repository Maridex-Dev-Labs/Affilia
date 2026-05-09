import 'server-only';

import { createServiceRoleClient } from './supabase-service';
import { buildZip } from './simple-zip';

const encoder = new TextEncoder();

function asJson(data: unknown) {
  return encoder.encode(`${JSON.stringify(data, null, 2)}\n`);
}

function fileNameFromPath(path: string, fallback: string) {
  const last = path.split('/').pop();
  return last && last.trim() ? last : fallback;
}

function knownDocumentTargets(profile: any) {
  const documents = profile?.documents || {};
  const affiliateDocs = documents.affiliate_verification || {};
  const merchantDocs = documents.merchant_verification || {};
  const targets: Array<{ bucket: string; path: string; name: string }> = [];

  if (typeof merchantDocs.business_document_path === 'string') {
    targets.push({
      bucket: 'merchant-docs',
      path: merchantDocs.business_document_path,
      name: `documents/${fileNameFromPath(merchantDocs.business_document_path, 'business-document')}`,
    });
  }
  if (typeof affiliateDocs.id_front_path === 'string') {
    targets.push({
      bucket: 'merchant-docs',
      path: affiliateDocs.id_front_path,
      name: `documents/${fileNameFromPath(affiliateDocs.id_front_path, 'national-id-front')}`,
    });
  }
  if (typeof affiliateDocs.id_back_path === 'string') {
    targets.push({
      bucket: 'merchant-docs',
      path: affiliateDocs.id_back_path,
      name: `documents/${fileNameFromPath(affiliateDocs.id_back_path, 'national-id-back')}`,
    });
  }

  return targets;
}

export async function buildUserExportZip(userId: string) {
  const supabase = createServiceRoleClient();
  const entries: Array<{ name: string; data: Uint8Array }> = [];

  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (profileError || !profile) throw new Error(profileError?.message || 'Profile not found.');

  const role = profile.role;
  const [plans, receipts, agreements, agreementEvents, tutorProfile, membership, deposits, payouts, conversions, links, products, escrow, posts, comments, threads, messages] = await Promise.all([
    supabase.from('profile_plan_selections').select('*').eq('profile_id', userId).order('updated_at', { ascending: false }),
    supabase.from('official_receipts').select('*').eq('recipient_id', userId).order('generated_at', { ascending: false }),
    supabase.from('legal_agreements').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('legal_agreement_events').select('*').eq('actor_user_id', userId).order('created_at', { ascending: false }),
    supabase.from('academy_tutor_profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('academy_memberships').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('deposit_requests').select('*').eq('merchant_id', userId).order('created_at', { ascending: false }),
    supabase.from('payouts').select('*').eq('affiliate_id', userId).order('created_at', { ascending: false }),
    supabase.from('conversions').select('*').or(`merchant_id.eq.${userId},affiliate_id.eq.${userId}`).order('created_at', { ascending: false }),
    supabase.from('affiliate_links').select('*').eq('affiliate_id', userId).order('created_at', { ascending: false }),
    supabase.from('products').select('*').eq('merchant_id', userId).order('created_at', { ascending: false }),
    supabase.from('merchant_escrow').select('*').eq('merchant_id', userId).maybeSingle(),
    supabase.from('forum_posts').select('*').eq('author_id', userId).order('created_at', { ascending: false }),
    supabase.from('forum_comments').select('*').eq('author_id', userId).order('created_at', { ascending: false }),
    supabase.from('chat_thread_members').select('thread_id').eq('user_id', userId),
    supabase.from('chat_messages').select('*').eq('sender_id', userId).order('created_at', { ascending: false }),
  ]);

  let chatThreads: any[] = [];
  if (threads.data?.length) {
    const ids = threads.data.map((item) => item.thread_id).filter(Boolean);
    if (ids.length) {
      const { data } = await supabase.from('chat_threads').select('*').in('id', ids);
      chatThreads = data || [];
    }
  }

  entries.push({ name: 'manifest.json', data: asJson({ exported_at: new Date().toISOString(), user_id: userId, role }) });
  entries.push({ name: 'profile/profile.json', data: asJson(profile) });
  entries.push({ name: 'profile/plan-selections.json', data: asJson(plans.data || []) });
  entries.push({ name: 'billing/deposit-requests.json', data: asJson(deposits.data || []) });
  entries.push({ name: 'billing/payouts.json', data: asJson(payouts.data || []) });
  entries.push({ name: 'billing/merchant-escrow.json', data: asJson(escrow.data || null) });
  entries.push({ name: 'billing/receipts.json', data: asJson(receipts.data || []) });
  entries.push({ name: 'agreements/legal-agreements.json', data: asJson(agreements.data || []) });
  entries.push({ name: 'agreements/legal-agreement-events.json', data: asJson(agreementEvents.data || []) });
  entries.push({ name: 'academy/membership.json', data: asJson(membership.data || null) });
  entries.push({ name: 'academy/tutor-profile.json', data: asJson(tutorProfile.data || null) });
  entries.push({ name: 'community/forum-posts.json', data: asJson(posts.data || []) });
  entries.push({ name: 'community/forum-comments.json', data: asJson(comments.data || []) });
  entries.push({ name: 'community/chat-threads.json', data: asJson(chatThreads) });
  entries.push({ name: 'community/chat-messages.json', data: asJson(messages.data || []) });
  entries.push({ name: role === 'affiliate' ? 'affiliate/links.json' : 'merchant/products.json', data: asJson(role === 'affiliate' ? links.data || [] : products.data || []) });
  entries.push({ name: 'activity/conversions.json', data: asJson(conversions.data || []) });

  const documentTargets = knownDocumentTargets(profile);
  for (const agreement of agreements.data || []) {
    if (typeof agreement.signed_contract_storage_path === 'string') {
      documentTargets.push({
        bucket: 'legal-agreements',
        path: agreement.signed_contract_storage_path,
        name: `agreements/files/${agreement.signed_contract_filename || fileNameFromPath(agreement.signed_contract_storage_path, 'signed-agreement.pdf')}`,
      });
    }
  }

  for (const target of documentTargets) {
    const { data, error } = await supabase.storage.from(target.bucket).download(target.path);
    if (error || !data) continue;
    const arrayBuffer = await data.arrayBuffer();
    entries.push({ name: target.name, data: new Uint8Array(arrayBuffer) });
  }

  return buildZip(entries);
}
