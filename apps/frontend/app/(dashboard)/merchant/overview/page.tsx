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
          { label: 'Escrow Balance', value: `KES ${data.stats?.escrow_balance || 0}`, delta: 'Available now' },
          { label: 'Reserved Commission', value: `KES ${data.stats?.reserved_balance || 0}`, delta: 'Held for review' },
          { label: 'Products', value: `${data.stats?.products || 0}`, delta: 'Live listings' },
          { label: 'Affiliates', value: `${data.stats?.affiliates || 0}`, delta: 'Promoting now' },
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

  if (loading) return <div className="text-muted">Loading merchant overview...</div>;
  if (error) return <div className="surface-panel p-6 text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(187,0,0,0.12),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(0,154,68,0.08),_transparent_30%),linear-gradient(135deg,_rgba(26,35,54,0.98),_rgba(16,22,35,0.96))] px-6 py-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#95a0b5]">Merchant operations</div>
            <h1 className="mt-3 text-4xl font-black italic text-white">Welcome back, {profile?.business_name || profile?.full_name || 'Merchant'}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#cad2e0]">Monitor cash position, review selling activity, and keep products ready for the marketplace.</p>
          </div>
          <Link className="button-primary rounded-full px-5 py-3 text-sm font-semibold" href="/merchant/escrow#deposit-form">
            Deposit Funds
          </Link>
        </div>
      </section>

      <section className="metric-strip grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="surface-panel px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#95a0b5]">{stat.label}</p>
            <div className="mt-2 text-2xl font-black text-white">{stat.value}</div>
            <p className="mt-1 text-sm text-[#cad2e0]">{stat.delta}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr,1.2fr]">
        <div className="surface-panel p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#95a0b5]">Merchant level</div>
          <h2 className="mt-2 text-2xl font-black text-white">{currentLevel.title}</h2>
          <div className="mt-5 h-2 rounded-full bg-white/8 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-black via-red-600 to-green-600" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-[#cad2e0]">{xp} / {nextLevel.xp} XP to {nextLevel.title}</p>
        </div>

        <div className="surface-panel p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#95a0b5]">System review items</div>
          <div className="mt-4 space-y-1">
            {pendingActions.map((a) => (
              <div key={a} className="info-row text-sm text-[#d6deea]">{a}</div>
            ))}
            {pendingActions.length === 0 && <div className="text-sm text-[#cad2e0]">No review items are currently waiting.</div>}
          </div>
        </div>
      </section>

      <section className="surface-panel overflow-hidden p-0">
        <div className="border-b border-white/6 px-6 py-5">
          <h2 className="text-xl font-black text-white">Recent transactions</h2>
          <p className="mt-1 text-sm text-[#cad2e0]">Latest orders and affiliate commission movements tied to your products.</p>
        </div>
        <div className="overflow-x-auto px-6 py-4">
          <table className="w-full text-sm">
            <thead className="text-left text-[#95a0b5]">
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
                <tr key={row.id} className="border-t border-soft text-[#e6ebf5]">
                  <td className="py-3">{row.product_title || row.product_id}</td>
                  <td className="py-3">{row.affiliate_name || row.affiliate_id}</td>
                  <td className="py-3">KES {row.order_value_kes}</td>
                  <td className="py-3">KES {row.commission_earned_kes}</td>
                  <td className="py-3 capitalize text-[#cad2e0]">{row.status.replaceAll('_', ' ')}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td className="py-6 text-[#cad2e0]" colSpan={5}>
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
