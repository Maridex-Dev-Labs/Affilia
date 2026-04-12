'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';
import { logAdminAction } from '@/lib/security/audit-logger';

export default function Page() {
  const [payouts, setPayouts] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from('payouts')
      .select('id, affiliate_id, amount_kes, status, created_at, profiles:affiliate_id(full_name)')
      .order('created_at', { ascending: false });
    setPayouts(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const markPaid = async (id: string) => {
    await supabase.from('payouts').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
    await logAdminAction('payout_mark_paid', 'payout', id);
    load();
  };

  const total = payouts.reduce((acc, p) => acc + (p.amount_kes || 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payout Sweeps</h1>
      <div className="card-surface p-6">Total Pending: KES {total}</div>
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
                <td className="py-3">{p.profiles?.full_name || p.affiliate_id}</td>
                <td className="py-3">KES {p.amount_kes}</td>
                <td className="py-3">{p.status}</td>
                <td className="py-3">
                  {p.status !== 'paid' && (
                    <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => markPaid(p.id)}>
                      Mark Paid
                    </button>
                  )}
                </td>
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
