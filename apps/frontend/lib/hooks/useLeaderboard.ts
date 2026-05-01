'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

type LeaderboardRow = {
  id: string;
  rank: number;
  total: number;
  name: string;
};

type RawLeaderboardRow = {
  affiliate_id: string;
  total: number | string;
};

export function useLeaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
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
        const { data: leaderboard, error: leaderboardError } = await supabase.rpc('get_leaderboard', { limit_count: 100 });
        if (leaderboardError) {
          throw leaderboardError;
        }

        const typedLeaderboard = ((leaderboard || []) as RawLeaderboardRow[]).filter((row) => Boolean(row.affiliate_id));
        const affiliateIds = typedLeaderboard.map((row) => row.affiliate_id);
        const { data: profiles, error: profilesError } = affiliateIds.length
          ? await supabase.from('profiles').select('id, full_name, business_name').in('id', affiliateIds)
          : { data: [], error: null };
        if (profilesError) {
          throw profilesError;
        }

        const profileMap = new Map(
          (profiles || []).map((profile) => [profile.id, profile.full_name || profile.business_name || profile.id]),
        );

        const normalizedRows = typedLeaderboard.map((row, index) => ({
          id: row.affiliate_id,
          rank: index + 1,
          total: Number(row.total || 0),
          name: profileMap.get(row.affiliate_id) || row.affiliate_id,
        }));

        setRows(normalizedRows);
        setTotal(normalizedRows.length);
        setUserRank(normalizedRows.find((row) => row.id === user.id)?.rank ?? null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load leaderboard.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  return { rows, userRank, total, loading, error };
}
