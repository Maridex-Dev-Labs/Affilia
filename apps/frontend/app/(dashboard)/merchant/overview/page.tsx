'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { loadMerchantOverview } from '@/lib/dashboard/merchant-overview';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import { levels } from '@/lib/config/levels';
import { sanitizeUserFacingError } from '@/lib/errors';

type StatCard = {
  label: string;
  value: string;
  delta: string;
};

type MerchantTransaction = {
  id: string;
  product_id: string;
  product_title?: string;
  affiliate_id: string;
  affiliate_name?: string;
  order_value_kes: number;
  commission_earned_kes: number;
  status: string;
};

export default function Page() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [pendingActions, setPendingActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadMerchantOverview(user.id);
        setStats([
          { label: 'Escrow Balance', value: `KES ${data.stats?.escrow_balance || 0}`, delta: 'Updated' },
          { label: 'Products', value: `${data.stats?.products || 0}`, delta: 'Active' },
          { label: 'Affiliates', value: `${data.stats?.affiliates || 0}`, delta: 'Active' },
          { label: 'Sales', value: `KES ${data.stats?.sales_total || 0}`, delta: 'Lifetime' },
        ]);
        setTransactions(data.recent_transactions || []);
        setPendingActions(data.pending_actions || []);
      } catch (err: unknown) {
        setError(sanitizeUserFacingError(err, 'We could not load the merchant overview right now.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const xp = profile?.xp_points || 0;
  const currentLevel = useMemo(() => levels.slice().reverse().find((l) => xp >= l.xp) || levels[0], [xp]);
  const nextLevel = useMemo(() => levels.find((l) => l.xp > xp) || currentLevel, [xp, currentLevel]);
  const progress = nextLevel.xp === currentLevel.xp ? 100 : Math.min(100, ((xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100);

  if (loading) {
    return <div className="text-muted">Loading merchant overview...</div>;
  }

  if (error) {
    return <div className="card-surface p-6 text-sm text-red-300">{error}</div>;
  }

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
                <td className="py-3">{row.product_title || row.product_id}</td>
                <td className="py-3">{row.affiliate_name || row.affiliate_id}</td>
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
