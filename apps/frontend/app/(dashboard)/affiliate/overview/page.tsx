'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { loadAffiliateOverview } from '@/lib/dashboard/affiliate-overview';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import { levels } from '@/lib/config/levels';
import { getPrimaryMediaUrl } from '@/lib/utils/product-media';
import { sanitizeUserFacingError } from '@/lib/errors';

type StatCard = {
  label: string;
  value: string;
  delta: string;
};

type ChallengeCard = {
  label: string;
  progress: string;
  percent: number;
};

type TrendingProduct = {
  id: string;
  title: string;
  price_kes: number;
  commission_percent: number;
  images?: string[];
  media?: Array<{ type: 'image' | 'video'; url: string }>;
};

export default function Page() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [trending, setTrending] = useState<TrendingProduct[]>([]);
  const [challenges, setChallenges] = useState<ChallengeCard[]>([]);
  const [leaderboardTotal, setLeaderboardTotal] = useState(0);
  const [userRank, setUserRank] = useState<number | null>(null);
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
        const dashboard = await loadAffiliateOverview(user.id);
        setUserRank(dashboard.rank ?? null);
        setLeaderboardTotal(dashboard.leaderboardTotal || 0);
        setStats([
          { label: "Today's Earnings", value: `KES ${dashboard.today || 0}`, delta: 'Tracked today' },
          { label: 'Total Earnings', value: `KES ${dashboard.total || 0}`, delta: 'All-time' },
          { label: 'Active Links', value: `${dashboard.links || 0}`, delta: `${dashboard.clicks || 0} total clicks` },
          { label: 'Weekly Rank', value: dashboard.rank ? `#${dashboard.rank}` : '#-', delta: `${dashboard.leaderboardTotal || 0} affiliates` },
        ]);
        setChallenges([
          { label: 'Generate 5 links', progress: `${Math.min(dashboard.links || 0, 5)}/5`, percent: Math.min(100, ((dashboard.links || 0) / 5) * 100) },
          { label: 'Make 1 sale today', progress: dashboard.today > 0 ? '1/1' : '0/1', percent: dashboard.today > 0 ? 100 : 0 },
          { label: 'Get 10 clicks today', progress: `${Math.min(dashboard.clicks || 0, 10)}/10`, percent: Math.min(100, ((dashboard.clicks || 0) / 10) * 100) },
        ]);
        setTrending(dashboard.trending || []);
      } catch (err: unknown) {
        setError(sanitizeUserFacingError(err, 'We could not load the affiliate overview right now.'));
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
    return <div className="text-muted">Loading affiliate overview...</div>;
  }

  if (error) {
    return <div className="surface-panel p-6 text-sm text-red-300">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(0,154,68,0.12),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(187,0,0,0.08),_transparent_34%),linear-gradient(135deg,_rgba(26,35,54,0.98),_rgba(16,22,35,0.96))] px-6 py-7">
        <div className="grid gap-6 lg:grid-cols-[1.35fr,0.65fr]">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#95a0b5]">Affiliate performance</div>
            <h1 className="mt-3 text-4xl font-black italic text-white">Jambo, {profile?.full_name || 'Affiliate'}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#cad2e0]">
              Track your live links, stay on top of your rank, and move quickly on products already performing in your niches.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Link href="/affiliate/my-links" className="button-primary rounded-full px-5 py-3 font-semibold">Open My Links</Link>
              <Link href="/affiliate/marketplace" className="rounded-full border border-white/12 px-5 py-3 font-semibold text-white hover:bg-white/[0.04]">Browse Marketplace</Link>
            </div>
          </div>
          <div className="soft-panel p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#95a0b5]">Position</div>
            <div className="mt-3 text-4xl font-black text-white">{userRank ? `#${userRank}` : '#-'}</div>
            <p className="mt-2 text-sm text-[#c5cede]">Out of {leaderboardTotal || 0} active affiliates currently tracked this cycle.</p>
          </div>
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

      <section className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="surface-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#95a0b5]">Level progress</div>
              <h2 className="mt-2 text-2xl font-black text-white">{currentLevel.title}</h2>
            </div>
            <div className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#cad2e0]">{xp} XP</div>
          </div>
          <div className="mt-5 h-2 rounded-full bg-white/8 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-black via-red-600 to-green-600" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-[#cad2e0]">{xp} / {nextLevel.xp} XP to {nextLevel.title}</p>
        </div>

        <div className="surface-panel p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#95a0b5]">Today’s targets</div>
          <div className="mt-4 space-y-4">
            {challenges.map((c) => (
              <div key={c.label} className="info-row py-0 border-none flex-col gap-2">
                <div className="flex w-full items-center justify-between text-sm text-white">
                  <span>{c.label}</span>
                  <span className="text-[#cad2e0]">{c.progress}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full bg-kenya-green" style={{ width: `${c.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-panel p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#95a0b5]">Trending now</div>
            <h2 className="mt-2 text-2xl font-black text-white">Products moving in your niches</h2>
          </div>
          <Link className="text-sm font-semibold text-white/80 hover:text-white" href="/affiliate/marketplace">View all products</Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {trending.map((item) => (
            <div key={item.id} className="soft-panel overflow-hidden p-0">
              {getPrimaryMediaUrl(item) ? (
                <img src={getPrimaryMediaUrl(item) || ''} alt={item.title} className="h-32 w-full object-cover" />
              ) : (
                <div className="h-32 bg-white/5" />
              )}
              <div className="px-4 py-4">
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-xs text-[#cad2e0]">KES {item.price_kes}</div>
                <div className="mt-3 flex gap-2">
                  <Link className="inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.04]" href={`/affiliate/marketplace/${item.id}`}>
                    Open product
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
