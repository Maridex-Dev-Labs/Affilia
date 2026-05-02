'use client';

import { useEffect, useState } from 'react';

import { adminApi } from '@/lib/api/admin';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

type SalesReviewItem = {
  id: string;
  order_value_kes: number;
  commission_earned_kes: number;
  customer_reference?: string | null;
  created_at: string;
  review_notes?: string | null;
  affiliate_profile?: { full_name?: string | null; business_name?: string | null } | null;
  product?: { title?: string | null } | null;
  merchant_profile?: { full_name?: string | null; business_name?: string | null } | null;
};

export default function Page() {
  const { can, loading: accessLoading } = useAdminAccess();
  const [items, setItems] = useState<SalesReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await adminApi.pendingSalesReview();
      setItems(data.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load pending sales.';
      setError(message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (id: string) => {
    setError(null);
    try {
      await adminApi.approveSalesReview(id, {});
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve sale.';
      setError(message);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt('Reason for rejecting this attributed sale?');
    if (!reason?.trim()) return;
    setError(null);
    try {
      await adminApi.rejectSalesReview(id, { reason });
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject sale.';
      setError(message);
    }
  };

  if (accessLoading) return <div className="text-muted">Loading access...</div>;
  if (!can('conversion.review')) return <div className="card-surface p-6 text-sm text-muted">You do not have permission to review attributed sales.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Attributed Sales Review</h1>
      {error ? <div className="card-surface p-4 text-sm text-red-300">{error}</div> : null}
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Merchant</th>
              <th className="py-2">Affiliate</th>
              <th className="py-2">Product</th>
              <th className="py-2">Ref</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Commission</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-soft align-top">
                <td className="py-3">{item.merchant_profile?.business_name || item.merchant_profile?.full_name || 'Merchant'}</td>
                <td className="py-3">{item.affiliate_profile?.full_name || item.affiliate_profile?.business_name || 'Affiliate'}</td>
                <td className="py-3">{item.product?.title || 'Product'}</td>
                <td className="py-3">
                  <div>{item.customer_reference || '—'}</div>
                  <div className="text-xs text-muted">{item.review_notes || 'No notes'}</div>
                </td>
                <td className="py-3">KES {item.order_value_kes}</td>
                <td className="py-3">KES {item.commission_earned_kes}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => approve(item.id)}>
                      Approve
                    </button>
                    <button className="text-xs border border-[#BB0000]/30 text-[#f5c2c2] rounded-full px-3 py-1" onClick={() => reject(item.id)}>
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-muted">
                  No pending attributed sales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
