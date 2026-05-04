'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { adminApi } from '@/lib/api/admin';
import { supabase } from '@/lib/supabase/admin-client';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

type AgreementSummary = {
  id?: string;
  signed_contract_storage_path?: string | null;
  signed_contract_filename?: string | null;
  digital_signature?: string | null;
  acceptance_method?: string | null;
};

type MerchantVerificationItem = {
  id: string;
  business_name?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  business_verified?: boolean | null;
  mpesa_till?: string | null;
  documents?: Record<string, unknown> | null;
  avatar_url?: string | null;
  contract_status?: string | null;
  current_agreement?: AgreementSummary | null;
};

type AffiliateVerificationItem = {
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
  current_agreement?: AgreementSummary | null;
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
  const { can, loading: accessLoading } = useAdminAccess();
  const [merchants, setMerchants] = useState<MerchantVerificationItem[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateVerificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await adminApi.verificationQueue();
      setMerchants(data.merchants || []);
      setAffiliates(data.affiliates || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load verification queue.';
      setError(message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const approveMerchant = async (id: string) => {
    setError(null);
    try {
      await adminApi.verifyMerchant(id);
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve merchant.';
      setError(message);
    }
  };

  const approveAffiliate = async (id: string) => {
    setError(null);
    try {
      await adminApi.verifyAffiliate(id, {});
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve affiliate.';
      setError(message);
    }
  };

  const rejectAffiliate = async (id: string) => {
    const reason = window.prompt('Reason for rejecting or restricting this affiliate verification?');
    if (!reason?.trim()) return;
    setError(null);
    try {
      await adminApi.rejectAffiliate(id, { reason });
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject affiliate.';
      setError(message);
    }
  };

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
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      if (rawPath.startsWith('http')) {
        window.open(rawPath, '_blank', 'noopener,noreferrer');
        return;
      }
      setStatus(err instanceof Error ? err.message : 'Failed to open document.');
    }
  };

  const renderAgreementActions = (agreement?: AgreementSummary | null) => {
    if (!agreement) return <span className="text-xs text-muted">No agreement submission</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {agreement.digital_signature ? (
          <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => window.open(agreement.digital_signature || '', '_blank', 'noopener,noreferrer')}>
            View Signature
          </button>
        ) : null}
        {agreement.signed_contract_storage_path ? (
          <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => openSignedAsset('legal-agreements', agreement.signed_contract_storage_path!)}>
            View Agreement PDF
          </button>
        ) : null}
      </div>
    );
  };

  if (accessLoading) return <div className="text-muted">Loading access...</div>;
  if (!can('merchant.verify') && !can('affiliate.verify')) {
    return <div className="card-surface p-6 text-sm text-muted">You do not have permission to access verification requests.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Verification Queue</h1>
      {error ? <div className="card-surface p-4 text-sm text-red-300">{error}</div> : null}
      {status ? <div className="card-surface p-4 text-sm text-[#d8deea]">{status}</div> : null}

      {can('merchant.verify') ? (
        <div className="card-surface p-6 overflow-x-auto">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Merchant Verification</h2>
            <p className="mt-1 text-sm text-muted">Review business identity, uploaded registration proof, and agreement before approval.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-2">Merchant</th>
                <th className="py-2">Phone</th>
                <th className="py-2">Documents</th>
                <th className="py-2">Agreement</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((m) => {
                const registrationPath = typeof m.documents?.registration === 'string' ? (m.documents.registration as string) : null;
                return (
                  <tr key={m.id} className="border-t border-soft align-top">
                    <td className="py-3">
                      <Link className="underline" href={`/verifications/${m.id}`}>
                        {m.business_name || m.full_name}
                      </Link>
                      <div className="mt-1 text-xs text-muted">Status: {m.contract_status || 'under_review'}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.avatar_url ? (
                          <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => window.open(m.avatar_url || '', '_blank', 'noopener,noreferrer')}>
                            View Avatar
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3">{m.phone_number || '—'}</td>
                    <td className="py-3">
                      {registrationPath ? (
                        <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => openSignedAsset('merchant-docs', registrationPath)}>
                          View Business Doc
                        </button>
                      ) : (
                        <span className="text-xs text-muted">No business document</span>
                      )}
                    </td>
                    <td className="py-3">{renderAgreementActions(m.current_agreement)}</td>
                    <td className="py-3">
                      <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => approveMerchant(m.id)}>
                        Approve
                      </button>
                    </td>
                  </tr>
                );
              })}
              {merchants.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-muted">
                    No pending merchant verifications.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {can('affiliate.verify') ? (
        <div className="card-surface p-6 overflow-x-auto">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Affiliate Verification</h2>
            <p className="mt-1 text-sm text-muted">Review identity fields, avatar, duplicate-risk flags, and agreement artifacts before approval.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-2">Affiliate</th>
                <th className="py-2">Phones</th>
                <th className="py-2">National ID</th>
                <th className="py-2">Evidence</th>
                <th className="py-2">Status</th>
                <th className="py-2">Duplicate Risk</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((affiliate) => (
                <tr key={affiliate.id} className="border-t border-soft align-top">
                  <td className="py-3">{affiliate.full_name || affiliate.id}</td>
                  <td className="py-3">
                    <div>{affiliate.phone_number || '—'}</div>
                    <div className="text-xs text-muted">Payout: {affiliate.payout_phone || '—'}</div>
                  </td>
                  <td className="py-3">{affiliate.national_id_number || '—'}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {affiliate.avatar_url ? (
                        <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => window.open(affiliate.avatar_url || '', '_blank', 'noopener,noreferrer')}>
                          View Avatar
                        </button>
                      ) : null}
                      {renderAgreementActions(affiliate.current_agreement)}
                    </div>
                  </td>
                  <td className="py-3">{affiliate.affiliate_verification_status || 'under_review'}</td>
                  <td className="py-3 text-xs text-[#f2b8b8]">{affiliate.duplicate_flag_reason || affiliate.affiliate_verification_notes || '—'}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => approveAffiliate(affiliate.id)}>
                        Approve
                      </button>
                      <button className="text-xs border border-[#BB0000]/30 text-[#f5c2c2] rounded-full px-3 py-1" onClick={() => rejectAffiliate(affiliate.id)}>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {affiliates.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-muted">
                    No pending affiliate verifications.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
