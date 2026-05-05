import { supabase } from '@/lib/supabase/client';
import { buildPublicProductLink } from '@/lib/links/smart-links';

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function requireUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Please sign in again.');
  }
  return user.id;
}

export async function loadEscrowFallback() {
  const userId = await requireUserId();
  const [escrowResult, depositsResult] = await Promise.all([
    supabase.from('merchant_escrow').select('balance_kes, reserved_balance_kes').eq('merchant_id', userId).maybeSingle(),
    supabase.from('deposit_requests').select('*').eq('merchant_id', userId).order('created_at', { ascending: false }).limit(10),
  ]);
  if (escrowResult.error || depositsResult.error) {
    throw new Error(escrowResult.error?.message || depositsResult.error?.message || 'Failed to load escrow data.');
  }
  return {
    balance: toNumber(escrowResult.data?.balance_kes),
    reserved_balance: toNumber(escrowResult.data?.reserved_balance_kes),
    deposits: depositsResult.data || [],
  };
}

export async function submitDepositFallback(payload: { amount_kes: number; mpesa_code?: string | null; screenshot_url?: string | null }) {
  const userId = await requireUserId();
  const { error } = await supabase.from('deposit_requests').insert({
    merchant_id: userId,
    amount_kes: payload.amount_kes,
    mpesa_code: payload.mpesa_code,
    screenshot_url: payload.screenshot_url,
    status: 'pending',
  });
  if (error) {
    throw new Error(error.message);
  }
  return { status: 'submitted' };
}

export async function listReceiptsFallback() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('official_receipts')
    .select('*')
    .eq('recipient_id', userId)
    .order('generated_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return { items: data || [] };
}

export async function getReceiptFallback(receiptId: string) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('official_receipts')
    .select('*')
    .eq('id', receiptId)
    .eq('recipient_id', userId)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function generateAffiliateLinkFallback(productId: string) {
  const userId = await requireUserId();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('affiliate_verification_status, active_plan_code, plan_status')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('Please sign in again.');
  }
  if (profile.affiliate_verification_status !== 'verified') {
    throw new Error('Complete affiliate verification before generating links.');
  }
  const effectivePlanCode = profile.active_plan_code || 'affiliate_starter';
  const effectivePlanStatus = profile.plan_status || 'active';
  if (!effectivePlanCode || effectivePlanStatus !== 'active') {
    throw new Error('Activate an affiliate package in Settings before generating links.');
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('is_active', true)
    .eq('moderation_status', 'approved')
    .single();

  if (productError || !product) {
    throw new Error('Product not available for promotion.');
  }

  const code = `${userId.slice(0, 4)}-${Math.random().toString(16).slice(2, 8)}`.toUpperCase();
  const destinationUrl = buildPublicProductLink(productId, code);
  const { error } = await supabase.from('affiliate_links').insert({
    affiliate_id: userId,
    product_id: productId,
    unique_code: code,
    link_type: 'smart_link',
    destination_url: destinationUrl,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { code, destination_url: destinationUrl };
}


export async function listAffiliateLinksFallback() {
  const userId = await requireUserId();
  const { data: links, error } = await supabase
    .from('affiliate_links')
    .select('id, product_id, unique_code, destination_url, clicks, conversions, total_earned_kes, status, created_at')
    .eq('affiliate_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const productIds = Array.from(new Set((links || []).map((row) => row.product_id).filter(Boolean)));
  let productMap = new Map<string, { title?: string | null }>();
  if (productIds.length > 0) {
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, title')
      .in('id', productIds as string[]);
    if (productError) {
      throw new Error(productError.message);
    }
    productMap = new Map((products || []).map((product) => [product.id, product]));
  }

  return {
    items: (links || []).map((link) => ({
      ...link,
      destination_url: link.destination_url || buildPublicProductLink(link.product_id, link.unique_code),
      products: link.product_id ? productMap.get(link.product_id) || null : null,
    })),
  };
}

export async function mutateAffiliateLinkFallback(linkId: string, action: 'pause' | 'resume' | 'archive' | 'delete') {
  const userId = await requireUserId();
  const { data: existing, error: existingError } = await supabase
    .from('affiliate_links')
    .select('id, clicks, conversions, total_earned_kes')
    .eq('id', linkId)
    .eq('affiliate_id', userId)
    .single();

  if (existingError || !existing) {
    throw new Error(existingError?.message || 'Link not found.');
  }

  if (action === 'delete') {
    const hasActivity = toNumber(existing.clicks) > 0 || toNumber(existing.conversions) > 0 || toNumber(existing.total_earned_kes) > 0;
    if (hasActivity) {
      const { error: archiveError } = await supabase
        .from('affiliate_links')
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', linkId)
        .eq('affiliate_id', userId);
      if (archiveError) throw new Error(archiveError.message);
      return { status: 'archived' };
    }

    const { error: deleteError } = await supabase.from('affiliate_links').delete().eq('id', linkId).eq('affiliate_id', userId);
    if (deleteError) throw new Error(deleteError.message);
    return { status: 'deleted' };
  }

  const payload =
    action === 'pause'
      ? { status: 'paused' }
      : action === 'resume'
        ? { status: 'active', archived_at: null }
        : { status: 'archived', archived_at: new Date().toISOString() };

  const { error: updateError } = await supabase.from('affiliate_links').update(payload).eq('id', linkId).eq('affiliate_id', userId);
  if (updateError) {
    throw new Error(updateError.message);
  }
  return { status: payload.status };
}
