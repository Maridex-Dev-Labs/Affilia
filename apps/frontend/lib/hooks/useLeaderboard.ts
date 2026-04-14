'use client';

import { useEffect, useState } from 'react';

import { affiliateApi } from '@/lib/api/affiliate';

type LeaderboardRow = {
  id: string;
  rank: number;
  total: number;
  name: string;
};

export function useLeaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await affiliateApi.leaderboard();
        setRows(data.rows || []);
        setUserRank(data.user_rank ?? null);
        setTotal(data.total || 0);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load leaderboard.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { rows, userRank, total, loading, error };
}
