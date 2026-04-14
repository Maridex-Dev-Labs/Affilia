'use client';

import { useEffect, useState } from 'react';

import { adminApi } from '@/lib/api/admin';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

type DepositItem = {
  id: string;
  amount_kes: number;
  mpesa_code?: string | null;
  status: string;
  merchant_id: string;
  created_at: string;
  profiles?: {
    business_name?: string | null;
    full_name?: string | null;
  } | null;
};

export default function Page() {
  const { can, loading: accessLoading } = useAdminAccess();
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await adminApi.pendingDeposits();
      setDeposits(data.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load deposits.';
      setError(message);
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  const approve = async (id: string) => {
    setError(null);
    try {
      await adminApi.approveDeposit(id);
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve deposit.';
      setError(message);
    }
  };

  if (accessLoading) return <div className="text-muted">Loading access...</div>;
  if (!can('deposit.approve')) return <div className="card-surface p-6 text-sm text-muted">You do not have permission to approve deposits.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Deposit Requests</h1>
      {error ? <div className="card-surface p-4 text-sm text-red-300">{error}</div> : null}
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Merchant</th>
              <th className="py-2">Amount</th>
              <th className="py-2">M-Pesa</th>
              <th className="py-2">Status</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {deposits.map((d) => (
              <tr key={d.id} className="border-t border-soft">
                <td className="py-3">{d.profiles?.business_name || d.profiles?.full_name || d.merchant_id}</td>
                <td className="py-3">KES {d.amount_kes}</td>
                <td className="py-3">{d.mpesa_code}</td>
                <td className="py-3">{d.status}</td>
                <td className="py-3">
                  {d.status !== 'approved' && (
                    <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => approve(d.id)}>
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {deposits.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-muted">
                  No deposits.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
