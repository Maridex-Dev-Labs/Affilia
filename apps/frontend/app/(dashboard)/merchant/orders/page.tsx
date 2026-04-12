'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Page() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('conversions')
      .select('id, order_value_kes, commission_earned_kes, status, merchant_approved, created_at')
      .eq('merchant_id', user.id)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const approve = async (id: string) => {
    await supabase.from('conversions').update({ merchant_approved: true, status: 'approved' }).eq('id', id);
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Orders</h1>
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Order</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Commission</th>
              <th className="py-2">Status</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-soft">
                <td className="py-3">{o.id.slice(0, 8)}</td>
                <td className="py-3">KES {o.order_value_kes}</td>
                <td className="py-3">KES {o.commission_earned_kes}</td>
                <td className="py-3">{o.status}</td>
                <td className="py-3">
                  {!o.merchant_approved && (
                    <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => approve(o.id)}>
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td className="py-6 text-muted" colSpan={5}>
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
