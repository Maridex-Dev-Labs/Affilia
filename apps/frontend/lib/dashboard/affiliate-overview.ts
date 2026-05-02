import { supabase } from '@/lib/supabase/client';

type TrendingProduct = {
  id: string;
  title: string;
  price_kes: number;
  commission_percent: number;
  images?: string[];
  media?: Array<{ type: 'image' | 'video'; url: string }>;
};

export type AffiliateOverviewData = {
  today: number;
  total: number;
  links: number;
  clicks: number;
  rank: number | null;
  leaderboardTotal: number;
  trending: TrendingProduct[];
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loadAffiliateOverview(userId: string): Promise<AffiliateOverviewData> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [linksResult, conversionsResult, leaderboardResult, productsResult] = await Promise.all([
    supabase.from('affiliate_links').select('id, clicks, status').eq('affiliate_id', userId),
    supabase.from('conversions').select('commission_earned_kes, created_at').eq('affiliate_id', userId),
    supabase.rpc('get_leaderboard', { limit_count: 200 }),
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  const possibleError =
    linksResult.error || conversionsResult.error || leaderboardResult.error || productsResult.error;
  if (possibleError) {
    throw new Error(possibleError.message);
  }

  const links = linksResult.data || [];
  const conversions = conversionsResult.data || [];
  const leaderboard = leaderboardResult.data || [];

  const total = conversions.reduce((sum, row) => sum + toNumber(row.commission_earned_kes), 0);
  const today = conversions.reduce((sum, row) => {
    const createdAt = row.created_at ? new Date(row.created_at) : null;
    if (!createdAt || createdAt < todayStart) {
      return sum;
    }
    return sum + toNumber(row.commission_earned_kes);
  }, 0);
  const clicks = links.reduce((sum, row) => sum + toNumber(row.clicks), 0);

  let rank: number | null = null;
  for (const [index, row] of leaderboard.entries()) {
    if (row.affiliate_id === userId) {
      rank = index + 1;
      break;
    }
  }

  return {
    today,
    total,
    links: links.filter((row) => (row as any).status !== 'archived' && (row as any).status !== 'paused').length,
    clicks,
    rank,
    leaderboardTotal: leaderboard.length,
    trending: productsResult.data || [],
  };
}
