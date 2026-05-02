'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { adminApi } from '@/lib/api/admin';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

type MerchantVerificationItem = {
  id: string;
  business_name?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
};

type AffiliateVerificationItem = {
  id: string;
  full_name?: string | null;
  phone_number?: string | null;
  payout_phone?: string | null;
  national_id_number?: string | null;
  affiliate_verification_status?: string | null;
  duplicate_flag_reason?: string | null;
};

export default function Page() {
  const { can, loading: accessLoading } = useAdminAccess();
  const [merchants, setMerchants] = useState<MerchantVerificationItem[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateVerificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  if (accessLoading) return <div className="text-muted">Loading access...</div>;
  if (!can('merchant.verify') && !can('affiliate.verify')) {
    return <div className="card-surface p-6 text-sm text-muted">You do not have permission to access verification requests.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Verification Queue</h1>
      {error ? <div className="card-surface p-4 text-sm text-red-300">{error}</div> : null}

      {can('merchant.verify') ? (
        <div className="card-surface p-6 overflow-x-auto">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Merchant Verification</h2>
            <p className="mt-1 text-sm text-muted">Approve merchants whose business information is ready for activation.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-2">Merchant</th>
                <th className="py-2">Phone</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((m) => (
                <tr key={m.id} className="border-t border-soft">
                  <td className="py-3">
                    <Link className="underline" href={`/verifications/${m.id}`}>
                      {m.business_name || m.full_name}
                    </Link>
                  </td>
                  <td className="py-3">{m.phone_number}</td>
                  <td className="py-3">
                    <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => approveMerchant(m.id)}>
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
              {merchants.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-muted">
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
            <p className="mt-1 text-sm text-muted">Only verified affiliates can generate links, receive commissions, and access payout features.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-2">Affiliate</th>
                <th className="py-2">Phones</th>
                <th className="py-2">National ID</th>
                <th className="py-2">Status</th>
                <th className="py-2">Duplicate Risk</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((affiliate) => (
                <tr key={affiliate.id} className="border-t border-soft">
                  <td className="py-3">{affiliate.full_name || affiliate.id}</td>
                  <td className="py-3">
                    <div>{affiliate.phone_number || '—'}</div>
                    <div className="text-xs text-muted">Payout: {affiliate.payout_phone || '—'}</div>
                  </td>
                  <td className="py-3">{affiliate.national_id_number || '—'}</td>
                  <td className="py-3">{affiliate.affiliate_verification_status || 'under_review'}</td>
                  <td className="py-3 text-xs text-[#f2b8b8]">{affiliate.duplicate_flag_reason || '—'}</td>
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
                  <td colSpan={6} className="py-6 text-muted">
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
