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
          { label: "Today's Earnings", value: `KES ${dashboard.today || 0}`, delta: 'Today' },
          { label: 'Total Earnings', value: `KES ${dashboard.total || 0}`, delta: 'Lifetime' },
          { label: 'Active Links', value: `${dashboard.links || 0}`, delta: `${dashboard.clicks || 0} Clicks` },
          { label: 'Weekly Rank', value: dashboard.rank ? `#${dashboard.rank}` : '#-', delta: `${dashboard.leaderboardTotal || 0} Affiliates` },
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
    return <div className="card-surface p-6 text-sm text-red-300">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jambo, {profile?.full_name || 'Affiliate'}!</h1>
          <p className="text-muted mt-1">
            Your Rank: {userRank ? `#${userRank}` : '#-'} of {leaderboardTotal || 0}
          </p>
        </div>
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
          <h3 className="text-lg font-bold">Affiliate Level</h3>
          <p className="text-sm text-muted mt-2">{currentLevel.title.toUpperCase()} AFFILIATE</p>
          <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-black via-red-600 to-green-600" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted mt-2">
            {xp} / {nextLevel.xp} XP to {nextLevel.title}
          </p>
        </div>
        <div className="card-surface p-6">
          <h3 className="text-lg font-bold">Daily Challenges</h3>
          <div className="mt-4 space-y-4">
            {challenges.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-sm">
                  <span>{c.label}</span>
                  <span className="text-muted">{c.progress}</span>
                </div>
                <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-kenya-green" style={{ width: `${c.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-surface p-6 mt-6">
        <h3 className="text-lg font-bold">Trending in Your Niches</h3>
        <div className="grid gap-4 mt-4 sm:grid-cols-2 lg:grid-cols-4">
          {trending.map((item) => (
            <div key={item.id} className="border border-soft rounded-2xl p-4">
              {getPrimaryMediaUrl(item) ? (
                <img src={getPrimaryMediaUrl(item) || ''} alt={item.title} className="h-28 w-full rounded-xl object-cover" />
              ) : (
                <div className="h-28 bg-white/5 rounded-xl" />
              )}
              <div className="mt-3 text-sm font-semibold">{item.title}</div>
              <div className="text-xs text-muted">KES {item.price_kes}</div>
              <div className="text-xs text-muted">{item.commission_percent}% Comm</div>
              <Link
                className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-white/20 py-2 text-xs transition hover:bg-white/5"
                href={`/affiliate/marketplace/${item.id}`}
              >
                Get Link
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
