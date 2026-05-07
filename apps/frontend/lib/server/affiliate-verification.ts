import 'server-only';

import crypto from 'node:crypto';

import { createServiceRoleClient } from '@/lib/server/supabase-service';

function normalizeIdentifier(value: string) {
  return (value || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
}

function maskIdentifier(value: string) {
  const normalized = normalizeIdentifier(value);
  if (normalized.length <= 4) return normalized;
  return `${'*'.repeat(normalized.length - 4)}${normalized.slice(-4)}`;
}

function hashIdentifier(value: string) {
  const secret = process.env.SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'affilia-fallback-secret';
  return crypto.createHmac('sha256', secret).update(normalizeIdentifier(value)).digest('hex');
}

export async function submitAffiliateVerification(userId: string, payload: {
  national_id_number: string;
  id_front_path: string;
  id_back_path: string;
}) {
  const supabase = createServiceRoleClient();
  const nationalId = normalizeIdentifier(payload.national_id_number);
  const idFrontPath = payload.id_front_path?.trim();
  const idBackPath = payload.id_back_path?.trim();

  if (nationalId.length < 6) {
    throw new Error('Enter a valid national ID number.');
  }
  if (!idFrontPath) {
    throw new Error('Upload the front side of your national ID before submitting.');
  }
  if (!idBackPath) {
    throw new Error('Upload the back side of your national ID before submitting.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, phone_number, payout_phone, documents')
    .eq('id', userId)
    .eq('role', 'affiliate')
    .single();

  if (profileError || !profile) {
    throw new Error('You do not have access to this workspace.');
  }
  if (!profile.phone_number) {
    throw new Error('Save your primary phone number before submitting verification.');
  }
  if (!profile.payout_phone) {
    throw new Error('Save your payout phone number before submitting verification.');
  }

  const identityHash = hashIdentifier(nationalId);
  const { data: otherAffiliates, error: otherAffiliatesError } = await supabase
    .from('profiles')
    .select('id, phone_number, payout_phone, documents')
    .eq('role', 'affiliate')
    .neq('id', userId);

  if (otherAffiliatesError) {
    throw new Error('This workspace is temporarily unavailable. Please try again later.');
  }

  const duplicateReasons: string[] = [];
  for (const other of otherAffiliates || []) {
    const otherDocuments = ((other as any).documents || {}) as Record<string, any>;
    const otherIdentity = (otherDocuments.affiliate_verification || {}) as Record<string, any>;
    if (otherIdentity.national_id_hash === identityHash) {
      duplicateReasons.push('Another affiliate already uses this national ID number.');
      break;
    }
  }

  if ((otherAffiliates || []).some((row: any) => row.phone_number && row.phone_number === profile.phone_number)) {
    duplicateReasons.push('Another affiliate already uses this phone number.');
  }
  if ((otherAffiliates || []).some((row: any) => row.payout_phone && row.payout_phone === profile.payout_phone)) {
    duplicateReasons.push('Another affiliate already uses this payout phone number.');
  }

  const documents = { ...((profile.documents || {}) as Record<string, any>) };
  const affiliateDocuments = { ...((documents.affiliate_verification || {}) as Record<string, any>) };
  affiliateDocuments.national_id_hash = identityHash;
  affiliateDocuments.national_id_last4 = nationalId.slice(-4);
  affiliateDocuments.id_front_path = idFrontPath;
  affiliateDocuments.id_back_path = idBackPath;
  affiliateDocuments.submitted_at = new Date().toISOString();
  affiliateDocuments.status = duplicateReasons.length > 0 ? 'restricted_duplicate' : 'submitted';
  documents.affiliate_verification = affiliateDocuments;

  const updatePayload: Record<string, any> = {
    national_id_number: maskIdentifier(nationalId),
    affiliate_verification_status: duplicateReasons.length > 0 ? 'restricted_duplicate' : 'submitted',
    duplicate_flag_reason: duplicateReasons.length > 0 ? duplicateReasons.join(' ') : null,
    affiliate_verification_notes: duplicateReasons.length > 0
      ? 'Duplicate-risk checks failed during submission.'
      : 'Verification submitted and awaiting system review.',
    documents,
  };

  const { data: updatedRows, error: updateError } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select('*')
    .limit(1);

  if (updateError) {
    throw new Error('This workspace is temporarily unavailable. Please try again later.');
  }

  if (duplicateReasons.length > 0) {
    throw new Error('This affiliate account has been flagged for duplicate-risk review. Contact support or wait for system review.');
  }

  return {
    status: 'submitted',
    profile: updatedRows?.[0] || null,
  };
}
