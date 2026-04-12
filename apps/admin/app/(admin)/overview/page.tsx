'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/admin-client';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';

export default function Page() {
  const { user } = useAdminAuth();
  const [stats, setStats] = useState<any[]>([]);
  const [pendingMerchants, setPendingMerchants] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: escrows } = await supabase.from('merchant_escrow').select('balance_kes');
      const totalEscrow = (escrows || []).reduce((acc, e) => acc + (e.balance_kes || 0), 0);

      const { data: payouts } = await supabase.from('payouts').select('amount_kes').eq('status', 'pending');
      const pendingPayouts = (payouts || []).reduce((acc, p) => acc + (p.amount_kes || 0), 0);

      const { data: conversions } = await supabase.from('conversions').select('platform_fee_kes, created_at');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRevenue = (conversions || [])
        .filter((c) => new Date(c.created_at) >= today)
        .reduce((acc, c) => acc + (c.platform_fee_kes || 0), 0);

      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

      setStats([
        { label: 'Platform Escrow', value: `KES ${totalEscrow}`, delta: 'Live' },
        { label: 'Pending Payouts', value: `KES ${pendingPayouts}`, delta: 'Pending' },
        { label: 'Platform Revenue', value: `KES ${todayRevenue}`, delta: 'Today' },
        { label: 'Active Users', value: `${count || 0}`, delta: 'Total' },
      ]);

      const { data: merchants } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'merchant')
        .eq('business_verified', false)
        .order('created_at', { ascending: false })
        .limit(3);
      setPendingMerchants(merchants || []);

      const { data: deposits } = await supabase
        .from('deposit_requests')
        .select('id, amount_kes, mpesa_code, status, merchant_id, created_at, profiles:merchant_id(business_name, full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(3);
      setPendingDeposits(deposits || []);
    };
    load();
  }, []);

  const adminName = useMemo(() => user?.user_metadata?.full_name || user?.email || 'Admin', [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ADMIN COMMAND CENTER</h1>
          <p className="text-sm text-muted mt-1">Super Admin Access Granted</p>
        </div>
        <div className="text-sm text-muted">{adminName}</div>
      </div>

      <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-surface p-5">
            <p className="text-sm text-muted">{stat.label}</p>
            <div className="text-2xl font-bold mt-2">{stat.value}</div>
            <p className="text-xs text-muted mt-1">{stat.delta}</p>
          </div>
        ))}
      </div>

      <div className="card-surface p-6">
        <h3 className="text-lg font-bold">Quick Actions</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="border border-white/20 rounded-full px-4 py-2 text-xs" href="/sweeps">
            Run Daily Sweep
          </Link>
          <Link className="border border-white/20 rounded-full px-4 py-2 text-xs" href="/analytics">
            Export Report
          </Link>
          <Link className="border border-white/20 rounded-full px-4 py-2 text-xs" href="/broadcast">
            Broadcast Message
          </Link>
          <Link className="border border-white/20 rounded-full px-4 py-2 text-xs" href="/settings">
            System Health
          </Link>
        </div>
      </div>

      <div className="card-surface p-6">
        <h3 className="text-lg font-bold">Pending Merchant Verifications</h3>
        <div className="mt-4 space-y-3 text-sm">
          {pendingMerchants.map((m) => (
            <div key={m.id} className="flex justify-between border-b border-soft pb-3">
              <div>
                <p className="font-semibold">{m.business_name || m.full_name}</p>
                <p className="text-xs text-muted">{new Date(m.created_at).toLocaleString('en-KE')}</p>
              </div>
              <div className="text-xs text-muted">
                <Link className="underline" href={`/verifications/${m.id}`}>
                  Review
                </Link>
              </div>
            </div>
          ))}
          {pendingMerchants.length === 0 && <div className="text-muted">No pending verifications.</div>}
        </div>
      </div>

      <div className="card-surface p-6">
        <h3 className="text-lg font-bold">Pending Deposit Approvals</h3>
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Merchant</th>
              <th className="py-2">Amount</th>
              <th className="py-2">M-Pesa Code</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {pendingDeposits.map((d) => (
              <tr key={d.id} className="border-t border-soft">
                <td className="py-3">{d.profiles?.business_name || d.profiles?.full_name || d.merchant_id}</td>
                <td className="py-3">KES {d.amount_kes}</td>
                <td className="py-3">{d.mpesa_code || '—'}</td>
                <td className="py-3">{d.status}</td>
              </tr>
            ))}
            {pendingDeposits.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-muted">
                  No pending deposits.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
