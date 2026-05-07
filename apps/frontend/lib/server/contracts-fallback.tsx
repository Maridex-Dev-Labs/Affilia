// @ts-nocheck
import 'server-only';

import React from 'react';
import { pdf } from '@react-pdf/renderer';

import { contractMeta, type AgreementType } from '@/lib/legal/contracts';
import { ContractPdfDocument } from '@/lib/legal/contract-pdf';
import { createServiceRoleClient } from './supabase-service';

function buildContractSnapshot(agreementType: AgreementType, profile: Record<string, any>) {
  const meta = contractMeta[agreementType];
  return {
    generated_by: 'frontend-fallback',
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

export async function loadCurrentAgreement(userId: string, agreementType?: AgreementType) {
  const supabase = createServiceRoleClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role,contract_status,current_agreement_id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);

  const expectedType = (agreementType || (profile?.role as AgreementType | undefined)) ?? null;
  let agreement = null;

  if (expectedType) {
    const { data, error } = await supabase
      .from('legal_agreements')
      .select('*')
      .eq('user_id', userId)
      .eq('agreement_type', expectedType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    agreement = data;
  }

  return {
    agreement,
    contract_status: profile?.contract_status ?? null,
    current_agreement_id: profile?.current_agreement_id ?? null,
    expected_type: expectedType,
  };
}

export async function submitAgreement(userId: string, payload: Record<string, any>, clientIp?: string | null) {
  const supabase = createServiceRoleClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error(profileError?.message || 'Profile not found.');
  }

  if (profile.role !== payload.agreement_type) {
    throw new Error('Agreement type does not match this account role.');
  }

  if (!payload.accepted_terms || !payload.accepted_fees || !payload.accepted_privacy || !payload.accepted_dispute) {
    throw new Error('All legal acknowledgements must be accepted before submission.');
  }

  if (payload.acceptance_method === 'digital_signature' && !payload.digital_signature) {
    throw new Error('A digital signature is required for this submission method.');
  }

  if (payload.acceptance_method !== 'digital_signature' && !payload.signed_contract_storage_path) {
    throw new Error('Upload the signed contract before submitting.');
  }

  const openStatuses = ['pending', 'submitted', 'rejected', 'revision_requested'];
  const { data: openAgreements, error: openError } = await supabase
    .from('legal_agreements')
    .select('id')
    .eq('user_id', userId)
    .eq('agreement_type', payload.agreement_type)
    .in('status', openStatuses);

  if (openError) throw new Error(openError.message);

  for (const agreement of openAgreements || []) {
    await supabase.from('legal_agreements').update({ status: 'superseded' }).eq('id', agreement.id);
    await supabase.from('legal_agreement_events').insert({
      agreement_id: agreement.id,
      actor_id: userId,
      action: 'superseded',
      notes: 'Replaced by a newer submission through frontend fallback.',
    });
  }

  const now = new Date().toISOString();
  const insertPayload = {
    agreement_type: payload.agreement_type,
    user_id: userId,
    version: '1.0',
    status: 'submitted',
    acceptance_method: payload.acceptance_method,
    digital_signature: payload.digital_signature ?? null,
    digital_signature_date: payload.digital_signature ? now : null,
    digital_signature_ip: clientIp ?? null,
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
  };

  const { data: agreement, error: insertError } = await supabase
    .from('legal_agreements')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError || !agreement) {
    throw new Error(insertError?.message || 'Failed to create legal agreement record.');
  }

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      contract_status: 'under_review',
      current_agreement_id: agreement.id,
    })
    .eq('id', userId);

  if (profileUpdateError) throw new Error(profileUpdateError.message);

  const { error: eventError } = await supabase.from('legal_agreement_events').insert({
    agreement_id: agreement.id,
    actor_id: userId,
    action: 'submitted',
    notes: 'User submitted agreement through frontend fallback.',
  });

  if (eventError) throw new Error(eventError.message);

  return { status: 'submitted', agreement };
}

export async function generateAgreementPdf(agreementType: AgreementType) {
  return pdf(<ContractPdfDocument agreementType={agreementType} />).toBuffer();
}
