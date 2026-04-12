'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';
import { logAdminAction } from '@/lib/security/audit-logger';

export default function Page() {
  const [deposits, setDeposits] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from('deposit_requests')
      .select('id, amount_kes, mpesa_code, status, merchant_id, created_at, profiles:merchant_id(business_name, full_name)')
      .order('created_at', { ascending: false });
    setDeposits(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string, merchant_id: string, amount: number) => {
    await supabase.from('deposit_requests').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id);
    const { data: escrow } = await supabase.from('merchant_escrow').select('*').eq('merchant_id', merchant_id).single();
    if (escrow) {
      await supabase.from('merchant_escrow').update({ balance_kes: escrow.balance_kes + amount }).eq('id', escrow.id);
    } else {
      await supabase.from('merchant_escrow').insert({ merchant_id, balance_kes: amount });
    }
    await logAdminAction('deposit_approve', 'deposit_request', id);
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Deposit Requests</h1>
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
                    <button
                      className="text-xs border border-white/20 rounded-full px-3 py-1"
                      onClick={() => approve(d.id, d.merchant_id, d.amount_kes)}
                    >
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
