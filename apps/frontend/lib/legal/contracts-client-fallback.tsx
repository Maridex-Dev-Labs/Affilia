// @ts-nocheck
import React from 'react';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

import { supabase } from '@/lib/supabase/client';
import { contractMeta, type AgreementType } from '@/lib/legal/contracts';
import type { SubmitAgreementPayload } from '@/lib/api/contracts';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: '#101522', backgroundColor: '#f6f0e6' },
  header: { marginBottom: 18, borderBottomWidth: 2, borderBottomColor: '#0f8a43', paddingBottom: 10 },
  eyebrow: { fontSize: 10, color: '#8d1b1b', letterSpacing: 1.2, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  subtitle: { fontSize: 10, color: '#566070', lineHeight: 1.5 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#0a6a36' },
  card: { borderWidth: 1, borderColor: '#d8d2c4', borderRadius: 8, padding: 12, marginBottom: 10, backgroundColor: '#fffdf8' },
  itemTitle: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  body: { fontSize: 10, lineHeight: 1.6, color: '#313b4c' },
  footer: { position: 'absolute', left: 40, right: 40, bottom: 24, fontSize: 9, color: '#707887', textAlign: 'center' },
  watermark: { position: 'absolute', top: '44%', left: '17%', fontSize: 88, color: '#00000010', transform: 'rotate(-18deg)' },
});

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

export async function generateAgreementPdfFallback(agreementType: AgreementType) {
  const meta = contractMeta[agreementType];
  const title = agreementType === 'merchant' ? 'Affilia Merchant Agreement' : 'Affilia Affiliate Agreement';

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>AFFILIA</Text>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>AFFILIA LEGAL AGREEMENT</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{meta.blurb}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Summary</Text>
          {meta.summary.map((item) => (
            <View key={item} style={styles.card}>
              <Text style={styles.body}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Core Clauses</Text>
          {meta.clauses.map((clause) => (
            <View key={clause.heading} style={styles.card}>
              <Text style={styles.itemTitle}>{clause.heading}</Text>
              <Text style={styles.body}>{clause.detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Acknowledgements</Text>
          {meta.acknowledgements.map((item) => (
            <View key={item.key} style={styles.card}>
              <Text style={styles.body}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Affilia agreement preview generated in the browser.</Text>
      </Page>
    </Document>
  );

  return pdf(doc).toBlob();
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

export async function submitAgreementClientFallback(payload: SubmitAgreementPayload) {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) throw new Error('Please sign in and try again.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) throw new Error(profileError?.message || 'Profile not found.');
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

  const now = new Date().toISOString();
  const insertPayload = {
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
  };

  const { data: agreement, error: insertError } = await supabase
    .from('legal_agreements')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError || !agreement) throw new Error(insertError?.message || 'Failed to create legal agreement record.');

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ contract_status: 'under_review', current_agreement_id: agreement.id })
    .eq('id', user.id);
  if (profileUpdateError) throw profileUpdateError;

  const { error: eventError } = await supabase
    .from('legal_agreement_events')
    .insert({ agreement_id: agreement.id, actor_id: user.id, action: 'submitted', notes: 'User submitted agreement through client fallback.' });
  if (eventError) throw eventError;

  return { status: 'submitted', agreement };
}
