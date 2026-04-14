'use client';

import { useEffect, useState } from 'react';

import { adminApi } from '@/lib/api/admin';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

type PayoutItem = {
  id: string;
  affiliate_id: string;
  amount_kes: number;
  status: string;
  created_at: string;
  profiles?: {
    full_name?: string | null;
    business_name?: string | null;
  } | null;
};

export default function Page() {
  const { can, loading: accessLoading } = useAdminAccess();
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await adminApi.sweepPreview();
      setPayouts(data.items || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load payout sweep queue.';
      setError(message);
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  const processSweep = async () => {
    setError(null);
    try {
      await adminApi.confirmSweep();
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process payout sweep.';
      setError(message);
    }
  };

  if (accessLoading) return <div className="text-muted">Loading access...</div>;
  if (!can('payout.manage')) return <div className="card-surface p-6 text-sm text-muted">You do not have permission to manage payout sweeps.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payout Sweeps</h1>
      {error ? <div className="card-surface p-4 text-sm text-red-300">{error}</div> : null}
      <div className="card-surface p-6 flex items-center justify-between gap-4">
        <div>Total Pending: KES {total}</div>
        <button className="text-xs border border-white/20 rounded-full px-4 py-2" onClick={processSweep} disabled={payouts.length === 0}>
          Process Sweep
        </button>
      </div>
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Affiliate</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Status</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-soft">
                <td className="py-3">{p.profiles?.full_name || p.profiles?.business_name || p.affiliate_id}</td>
                <td className="py-3">KES {p.amount_kes}</td>
                <td className="py-3">{p.status}</td>
                <td className="py-3">{p.status === 'paid' ? 'Completed' : 'Queued'}</td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-muted">
                  No payouts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
