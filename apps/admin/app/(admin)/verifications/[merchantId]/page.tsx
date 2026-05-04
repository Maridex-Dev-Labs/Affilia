'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { supabase } from '@/lib/supabase/admin-client';
import { openSignedDocument } from '@/lib/documents/openDocument';

type MerchantDetail = {
  id: string;
  business_name?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  business_verified?: boolean | null;
  mpesa_till?: string | null;
  documents?: Record<string, unknown> | null;
  avatar_url?: string | null;
  store_description?: string | null;
  contract_status?: string | null;
  current_agreement?: {
    signed_contract_storage_path?: string | null;
    signed_contract_filename?: string | null;
    digital_signature?: string | null;
  } | null;
};

function extractBucketPath(bucket: string, value?: string | null) {
  if (!value) return null;
  if (!value.startsWith('http')) return value;
  try {
    const url = new URL(value);
    const segments = url.pathname.split(`/${bucket}/`);
    if (segments.length < 2) return null;
    return decodeURIComponent(segments[1]);
  } catch {
    return null;
  }
}

export default function Page() {
  const params = useParams<{ merchantId: string }>();
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id,business_name,full_name,phone_number,business_verified,mpesa_till,documents,avatar_url,store_description,contract_status,current_agreement:current_agreement_id(signed_contract_storage_path,signed_contract_filename,digital_signature)')
      .eq('id', params.merchantId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setStatus(error.message);
          return;
        }
        setMerchant(data as MerchantDetail);
      });
  }, [params.merchantId]);

  const openSignedAsset = async (bucket: string, rawPath: string) => {
    const path = extractBucketPath(bucket, rawPath) || rawPath;
    setStatus(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Admin session unavailable.');
      const response = await fetch('/api/verification-assets/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bucket, path, expiresIn: 120 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to open document.');
      openSignedDocument(data.signedUrl, path);
    } catch (err: unknown) {
      if (rawPath.startsWith('http')) {
        window.open(rawPath, '_blank', 'noopener,noreferrer');
        return;
      }
      setStatus(err instanceof Error ? err.message : 'Failed to open document.');
    }
  };

  if (!merchant) return <div className="text-muted">Loading...</div>;

  const registrationPath = typeof merchant.documents?.registration === 'string' ? (merchant.documents.registration as string) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{merchant.business_name || merchant.full_name}</h1>
        <p className="mt-2 text-sm text-muted">Detailed merchant verification view for visual checks and business document review.</p>
      </div>

      {status ? <div className="card-surface p-4 text-sm text-red-300">{status}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card-surface p-6 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Identity</div>
            <div className="mt-3 space-y-2 text-sm text-[#d8deea]">
              <p>Name: {merchant.full_name || '—'}</p>
              <p>Business: {merchant.business_name || '—'}</p>
              <p>Phone: {merchant.phone_number || '—'}</p>
              <p>M-Pesa Till: {merchant.mpesa_till || '—'}</p>
              <p>Verified: {merchant.business_verified ? 'Yes' : 'No'}</p>
              <p>Contract Status: {merchant.contract_status || 'under_review'}</p>
            </div>
          </div>
          {merchant.avatar_url ? <img src={merchant.avatar_url} alt="Merchant avatar" className="h-32 w-32 rounded-3xl object-cover border border-white/10" /> : null}
        </div>

        <div className="card-surface p-6 space-y-5">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Store Description</div>
            <p className="mt-3 text-sm text-[#d8deea]">{merchant.store_description || 'No store description submitted.'}</p>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Submitted Documents</div>
            <div className="mt-3 flex flex-wrap gap-3">
              {registrationPath ? (
                <button className="rounded-full border border-white/20 px-4 py-2 text-xs" onClick={() => openSignedAsset('merchant-docs', registrationPath)}>
                  Open Business Registration
                </button>
              ) : (
                <span className="text-sm text-muted">No business document uploaded.</span>
              )}
              {merchant.current_agreement?.signed_contract_storage_path ? (
                <button className="rounded-full border border-white/20 px-4 py-2 text-xs" onClick={() => openSignedAsset('legal-agreements', merchant.current_agreement?.signed_contract_storage_path || '')}>
                  Open Agreement PDF
                </button>
              ) : null}
              {merchant.current_agreement?.digital_signature ? (
                <button className="rounded-full border border-white/20 px-4 py-2 text-xs" onClick={() => window.open(merchant.current_agreement?.digital_signature || '', '_blank', 'noopener,noreferrer')}>
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
