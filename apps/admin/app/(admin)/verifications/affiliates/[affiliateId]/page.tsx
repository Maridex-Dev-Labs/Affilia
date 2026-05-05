'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { supabase } from '@/lib/supabase/admin-client';
import { openDocumentViewer } from '@/lib/documents/openDocument';

type AffiliateDetail = {
  id: string;
  full_name?: string | null;
  phone_number?: string | null;
  payout_phone?: string | null;
  national_id_number?: string | null;
  affiliate_verification_status?: string | null;
  duplicate_flag_reason?: string | null;
  affiliate_verification_notes?: string | null;
  avatar_url?: string | null;
  contract_status?: string | null;
  current_agreement?: {
    signed_contract_storage_path?: string | null;
    signed_contract_filename?: string | null;
    digital_signature?: string | null;
  } | null;
};

export default function Page() {
  const params = useParams<{ affiliateId: string }>();
  const [affiliate, setAffiliate] = useState<AffiliateDetail | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id,full_name,phone_number,payout_phone,national_id_number,affiliate_verification_status,duplicate_flag_reason,affiliate_verification_notes,avatar_url,contract_status,current_agreement:current_agreement_id(signed_contract_storage_path,signed_contract_filename,digital_signature)')
      .eq('id', params.affiliateId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setStatus(error.message);
          return;
        }
        setAffiliate(data as AffiliateDetail);
      });
  }, [params.affiliateId]);

  if (!affiliate) return <div className="text-muted">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{affiliate.full_name || affiliate.id}</h1>
        <p className="mt-2 text-sm text-muted">Detailed affiliate verification view for identity checks, duplicate-risk review, and agreement evidence.</p>
      </div>

      {status ? <div className="card-surface p-4 text-sm text-red-300">{status}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card-surface p-6 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Identity</div>
            <div className="mt-3 space-y-2 text-sm text-[#d8deea]">
              <p>Name: {affiliate.full_name || '—'}</p>
              <p>Phone: {affiliate.phone_number || '—'}</p>
              <p>Payout Phone: {affiliate.payout_phone || '—'}</p>
              <p>National ID: {affiliate.national_id_number || '—'}</p>
              <p>Verification Status: {affiliate.affiliate_verification_status || 'under_review'}</p>
              <p>Contract Status: {affiliate.contract_status || 'under_review'}</p>
            </div>
          </div>
          {affiliate.avatar_url ? (
            <button type="button" className="block" onClick={() => openDocumentViewer({ url: affiliate.avatar_url || '', name: 'affiliate-avatar' })}>
              <img src={affiliate.avatar_url} alt="Affiliate avatar" className="h-32 w-32 rounded-3xl object-cover border border-white/10" />
            </button>
          ) : null}
        </div>

        <div className="card-surface p-6 space-y-5">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Risk Review</div>
            <div className="mt-3 space-y-2 text-sm text-[#d8deea]">
              <p>Duplicate Flag: {affiliate.duplicate_flag_reason || 'None'}</p>
              <p>Review Notes: {affiliate.affiliate_verification_notes || 'None'}</p>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Submitted Evidence</div>
            <div className="mt-3 flex flex-wrap gap-3">
              {affiliate.avatar_url ? (
                <button className="rounded-full border border-white/20 px-4 py-2 text-xs" onClick={() => openDocumentViewer({ url: affiliate.avatar_url || '', name: 'affiliate-avatar' })}>
                  Open Avatar
                </button>
              ) : null}
              {affiliate.current_agreement?.signed_contract_storage_path ? (
                <button className="rounded-full border border-white/20 px-4 py-2 text-xs" onClick={() => openDocumentViewer({ bucket: 'legal-agreements', path: affiliate.current_agreement?.signed_contract_storage_path || '', name: affiliate.current_agreement?.signed_contract_filename || 'signed-agreement.pdf' })}>
                  Open Agreement PDF
                </button>
              ) : null}
              {affiliate.current_agreement?.digital_signature ? (
                <button className="rounded-full border border-white/20 px-4 py-2 text-xs" onClick={() => openDocumentViewer({ url: affiliate.current_agreement?.digital_signature || '', name: 'digital-signature.png' })}>
                  View Signature
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
