'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import { levels } from '@/lib/config/levels';

export default function Page() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [stats, setStats] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingActions, setPendingActions] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: escrow } = await supabase.from('merchant_escrow').select('*').eq('merchant_id', user.id).single();
      const { data: products } = await supabase.from('products').select('id, stock_status').eq('merchant_id', user.id);
      const { data: links } = await supabase.from('affiliate_links').select('id').in('product_id', (products || []).map((p) => p.id));
      const { data: conversions } = await supabase
        .from('conversions')
        .select('id, order_value_kes, commission_earned_kes, status, affiliate_id, product_id, created_at, products(title), profiles:affiliate_id(full_name)')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      const sales = (conversions || []).reduce((acc, c) => acc + (c.order_value_kes || 0), 0);
      setStats([
        { label: 'Escrow Balance', value: `KES ${escrow?.balance_kes || 0}`, delta: 'Updated' },
        { label: 'Products', value: `${(products || []).length}`, delta: 'Active' },
        { label: 'Affiliates', value: `${(links || []).length}`, delta: 'Active' },
        { label: 'Sales', value: `KES ${sales}`, delta: 'Recent' },
      ]);
      setTransactions(conversions || []);
      const pendingOrders = (conversions || []).filter((c) => c.status === 'pending').length;
      const lowStock = (products || []).filter((p) => p.stock_status === 'low_stock' || p.stock_status === 'out').length;
      const actions: string[] = [];
      if (pendingOrders > 0) actions.push(`${pendingOrders} orders awaiting approval`);
      if (lowStock > 0) actions.push(`${lowStock} products low/out of stock`);
      if ((escrow?.balance_kes || 0) < 100000) actions.push('Escrow below KES 100K');
      setPendingActions(actions);
    };
    load();
  }, [user]);

  const xp = profile?.xp_points || 0;
  const currentLevel = useMemo(() => levels.slice().reverse().find((l) => xp >= l.xp) || levels[0], [xp]);
  const nextLevel = useMemo(() => levels.find((l) => l.xp > xp) || currentLevel, [xp, currentLevel]);
  const progress = nextLevel.xp === currentLevel.xp ? 100 : Math.min(100, ((xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {profile?.business_name || profile?.full_name || 'Merchant'}!</h1>
          <p className="text-muted mt-1">Merchant Overview</p>
        </div>
        <Link className="button-primary rounded-full px-5 py-3 text-sm font-semibold" href="/merchant/escrow#deposit-form">
          Deposit Funds
        </Link>
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

      <div className="grid gap-6 mt-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h3 className="text-lg font-bold">Merchant Level</h3>
          <p className="text-sm text-muted mt-2">{currentLevel.title.toUpperCase()} MERCHANT</p>
          <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-black via-red-600 to-green-600" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted mt-2">
            {xp} / {nextLevel.xp} XP to {nextLevel.title}
          </p>
        </div>
        <div className="card-surface p-6">
          <h3 className="text-lg font-bold">Pending Actions</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            {pendingActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
            {pendingActions.length === 0 && <li>No pending actions.</li>}
          </ul>
        </div>
      </div>

      <div className="card-surface p-6 mt-6 overflow-x-auto">
        <h3 className="text-lg font-bold">Recent Transactions</h3>
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Product</th>
              <th className="py-2">Affiliate</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Commission</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((row) => (
              <tr key={row.id} className="border-t border-soft">
                <td className="py-3">{row.products?.title || row.product_id}</td>
                <td className="py-3">{row.profiles?.full_name || row.affiliate_id}</td>
                <td className="py-3">KES {row.order_value_kes}</td>
                <td className="py-3">KES {row.commission_earned_kes}</td>
                <td className="py-3">{row.status}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td className="py-6 text-muted" colSpan={5}>
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
