'use client';

import { useEffect, useState } from 'react';

import { adminApi } from '@/lib/api/admin';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

type BillingItem = {
  profile_id: string;
  role: 'merchant' | 'affiliate';
  plan_name: string;
  plan_code: string;
  amount_kes: number;
  payer_phone?: string | null;
  payment_reference: string;
  mpesa_reference?: string | null;
  status: string;
  paid_at?: string | null;
  profiles?: {
    full_name?: string | null;
    business_name?: string | null;
    phone_number?: string | null;
    role?: string | null;
    active_plan_code?: string | null;
    plan_status?: string | null;
  } | null;
};

export default function Page() {
  const { can, loading: accessLoading } = useAdminAccess();
  const [items, setItems] = useState<BillingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await adminApi.pendingBilling();
      setItems(data.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load billing approvals.';
      setError(message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (profileId: string) => {
    setError(null);
    try {
      await adminApi.approveBilling(profileId, {});
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve package.';
      setError(message);
    }
  };

  const reject = async (profileId: string) => {
    const reason = window.prompt('Reason for rejecting this payment confirmation?');
    if (!reason?.trim()) return;
    setError(null);
    try {
      await adminApi.rejectBilling(profileId, { reason });
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject package.';
      setError(message);
    }
  };

  if (accessLoading) return <div className="text-muted">Loading access...</div>;
  if (!can('billing.approve')) return <div className="card-surface p-6 text-sm text-muted">You do not have permission to approve billing plans.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Billing Approvals</h1>
      {error ? <div className="card-surface p-4 text-sm text-red-300">{error}</div> : null}
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">User</th>
              <th className="py-2">Role</th>
              <th className="py-2">Package</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Refs</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.profile_id} className="border-t border-soft">
                <td className="py-3">
                  <div>{item.profiles?.business_name || item.profiles?.full_name || item.profile_id}</div>
                  <div className="text-xs text-muted">{item.profiles?.phone_number || item.payer_phone || '—'}</div>
                </td>
                <td className="py-3 uppercase">{item.role}</td>
                <td className="py-3">
                  <div>{item.plan_name}</div>
                  <div className="text-xs text-muted">{item.plan_code}</div>
                </td>
                <td className="py-3">KES {item.amount_kes}</td>
                <td className="py-3">
                  <div>{item.payment_reference}</div>
                  <div className="text-xs text-muted">{item.mpesa_reference || 'No M-Pesa code'}</div>
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => approve(item.profile_id)}>
                      Approve
                    </button>
                    <button className="text-xs border border-[#BB0000]/30 text-[#f5c2c2] rounded-full px-3 py-1" onClick={() => reject(item.profile_id)}>
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-muted">
                  No package payments waiting for review.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
