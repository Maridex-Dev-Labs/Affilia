'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import { useLeaderboard } from '@/lib/hooks/useLeaderboard';
import { levels } from '@/lib/config/levels';
import { getPrimaryMediaUrl } from '@/lib/utils/product-media';

export default function Page() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { userRank, total: leaderboardTotal } = useLeaderboard(user?.id);
  const [stats, setStats] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: links } = await supabase.from('affiliate_links').select('id, clicks, created_at').eq('affiliate_id', user.id);
      const { data: conversions } = await supabase.from('conversions').select('commission_earned_kes, created_at').eq('affiliate_id', user.id);
      const totalEarnings = (conversions || []).reduce((acc, c) => acc + (c.commission_earned_kes || 0), 0);
      const clicks = (links || []).reduce((acc, l) => acc + (l.clicks || 0), 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEarnings = (conversions || []).filter((c) => new Date(c.created_at) >= today).reduce((acc, c) => acc + (c.commission_earned_kes || 0), 0);
      const linksToday = (links || []).filter((l) => new Date(l.created_at) >= today).length;
      const linkIds = (links || []).map((l) => l.id);
      let clicksToday = 0;
      if (linkIds.length > 0) {
        const { data: clickEvents } = await supabase
          .from('click_events')
          .select('id, clicked_at, link_id')
          .in('link_id', linkIds);
        clicksToday = (clickEvents || []).filter((c) => new Date(c.clicked_at) >= today).length;
      }
      setStats([
        { label: "Today's Earnings", value: `KES ${todayEarnings}`, delta: 'Today' },
        { label: 'Total Earnings', value: `KES ${totalEarnings}`, delta: 'Lifetime' },
        { label: 'Active Links', value: `${(links || []).length}`, delta: `${clicks} Clicks` },
        { label: 'Weekly Rank', value: userRank ? `#${userRank}` : '#-', delta: `${leaderboardTotal || 0} Affiliates` },
      ]);
      const challengeList = [
        { label: 'Generate 5 links', current: linksToday, target: 5 },
        { label: 'Make 1 sale today', current: todayEarnings > 0 ? 1 : 0, target: 1 },
        { label: 'Get 10 clicks today', current: clicksToday, target: 10 },
      ].map((c) => ({
        label: c.label,
        progress: `${Math.min(c.current, c.target)}/${c.target}`,
        percent: Math.min(100, (c.current / c.target) * 100),
      }));
      setChallenges(challengeList);
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .limit(4);
      setTrending(products || []);
    };
    load();
  }, [user, userRank, leaderboardTotal]);

  const xp = profile?.xp_points || 0;
  const currentLevel = useMemo(() => levels.slice().reverse().find((l) => xp >= l.xp) || levels[0], [xp]);
  const nextLevel = useMemo(() => levels.find((l) => l.xp > xp) || currentLevel, [xp, currentLevel]);
  const progress = nextLevel.xp === currentLevel.xp ? 100 : Math.min(100, ((xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100);
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
