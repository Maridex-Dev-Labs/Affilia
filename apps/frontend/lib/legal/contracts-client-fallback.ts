// @ts-nocheck
import { supabase } from '@/lib/supabase/client';
import { contractMeta, type AgreementType } from '@/lib/legal/contracts';
import type { SubmitAgreementPayload } from '@/lib/api/contracts';

function buildContractSnapshot(agreementType: AgreementType, profile: Record<string, any>) {
  const meta = contractMeta[agreementType];
  return {
    generated_by: 'frontend-client-fallback',
    agreement_type: agreementType,
    summary: meta.summary,
    clauses: meta.clauses,
    party: {
      full_name: profile.full_name,
      business_name: profile.business_name,
      email: profile.email,
      phone_number: profile.phone_number,
      payout_phone: profile.payout_phone,
      mpesa_till: profile.mpesa_till,
    },
  };
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]) {
  const content = ['BT', '/F1 11 Tf', '40 790 Td', '14 TL'];
  lines.forEach((line, index) => {
    const safe = escapePdfText(line || ' ');
    content.push(index === 0 ? `(${safe}) Tj` : `T* (${safe}) Tj`);
  });
  content.push('ET');
  const stream = content.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj',
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

export async function generateAgreementPdfFallback(agreementType: AgreementType) {
  const meta = contractMeta[agreementType];
  const title = agreementType === 'merchant' ? 'Affilia Merchant Agreement' : 'Affilia Affiliate Agreement';
  const lines = [
    title,
    ' ',
    meta.blurb,
    ' ',
    'Key Summary',
    ...meta.summary.map((item) => `- ${item}`),
    ' ',
    'Core Clauses',
    ...meta.clauses.flatMap((clause) => [clause.heading, clause.detail, ' ']),
    'Required Acknowledgements',
    ...meta.acknowledgements.map((item) => `- ${item.label}`),
    ' ',
    'Affilia agreement preview generated in the browser.',
  ];
  return buildSimplePdf(lines);
}

export async function loadCurrentAgreementClientFallback(agreementType?: AgreementType) {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) throw new Error('Please sign in and try again.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role,contract_status,current_agreement_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const expectedType = agreementType || ((profile?.role as AgreementType | null) ?? null);
  let agreement = null;

  if (expectedType) {
    const { data, error } = await supabase
      .from('legal_agreements')
      .select('*')
      .eq('user_id', user.id)
      .eq('agreement_type', expectedType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    agreement = data;
  }

  return {
    agreement,
    contract_status: profile?.contract_status ?? null,
    current_agreement_id: profile?.current_agreement_id ?? null,
    expected_type: expectedType,
  };
}

async function ensureProfile(userId: string) {
  const { data: existing, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  const { data: authData } = await supabase.auth.getUser();
  const full_name = authData.user?.user_metadata?.full_name ?? '';
  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert({ id: userId, full_name, onboarding_complete: false, role: null })
    .select('*')
    .single();
  if (createError || !created) throw new Error(createError?.message || 'Profile not found.');
  return created;
}

export async function submitAgreementClientFallback(payload: SubmitAgreementPayload) {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) throw new Error('Please sign in and try again.');

  const profile = await ensureProfile(user.id);
  if (profile.role !== payload.agreement_type) throw new Error('Agreement type does not match this account role.');
  if (!payload.accepted_terms || !payload.accepted_fees || !payload.accepted_privacy || !payload.accepted_dispute) {
    throw new Error('All legal acknowledgements must be accepted before submission.');
  }
  if (payload.acceptance_method === 'digital_signature' && !payload.digital_signature) {
    throw new Error('A digital signature is required for this submission method.');
  }
  if (payload.acceptance_method !== 'digital_signature' && !payload.signed_contract_storage_path) {
    throw new Error('Upload the signed contract before submitting.');
  }

  const { data: existingAgreements, error: existingError } = await supabase
    .from('legal_agreements')
    .select('id')
    .eq('user_id', user.id)
    .eq('agreement_type', payload.agreement_type)
    .in('status', ['pending', 'submitted', 'rejected', 'revision_requested']);
  if (existingError) throw existingError;

  for (const agreement of existingAgreements || []) {
    await supabase.from('legal_agreements').update({ status: 'superseded' }).eq('id', agreement.id);
  }

  const now = new Date().toISOString();
  const { data: agreement, error: insertError } = await supabase
    .from('legal_agreements')
    .insert({
      agreement_type: payload.agreement_type,
      user_id: user.id,
      version: '1.0',
      status: 'submitted',
      acceptance_method: payload.acceptance_method,
      digital_signature: payload.digital_signature ?? null,
      digital_signature_date: payload.digital_signature ? now : null,
      signature_full_name: payload.signature_full_name ?? null,
      accepted_terms: !!payload.accepted_terms,
      accepted_fees: !!payload.accepted_fees,
      accepted_privacy: !!payload.accepted_privacy,
      accepted_dispute: !!payload.accepted_dispute,
      signed_contract_storage_path: payload.signed_contract_storage_path ?? null,
      signed_contract_filename: payload.signed_contract_filename ?? null,
      signed_contract_size_bytes: payload.signed_contract_size_bytes ?? null,
      signed_contract_mime_type: payload.signed_contract_mime_type ?? null,
      submitted_at: now,
      contract_snapshot: buildContractSnapshot(payload.agreement_type, profile),
    })
    .select('*')
    .single();
  if (insertError || !agreement) throw new Error(insertError?.message || 'Failed to create legal agreement record.');

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ contract_status: 'under_review', current_agreement_id: agreement.id })
    .eq('id', user.id);
  if (profileUpdateError) throw profileUpdateError;

  await supabase.from('legal_agreement_events').insert({
    agreement_id: agreement.id,
    actor_id: user.id,
    action: 'submitted',
    notes: 'User submitted agreement through client fallback.',
  });

  return { status: 'submitted', agreement };
}
