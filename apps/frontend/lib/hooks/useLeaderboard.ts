'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';

export function useLeaderboard(userId?: string) {
  const [rows, setRows] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc('get_leaderboard', { limit_count: 50 });
      const sorted = (data || []).map((row: any, idx: number) => ({
        id: row.affiliate_id,
        total: row.total,
        rank: idx + 1,
      }));
      const ids = sorted.map((s: { id: string }) => s.id);
      let profilesMap = new Map<string, any>();
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, business_name').in('id', ids);
        (profiles || []).forEach((p: any) => profilesMap.set(p.id, p));
      }
      const withNames = sorted.map((s: { id: string; total: number; rank: number }) => ({
        ...s,
        name: profilesMap.get(s.id)?.full_name || profilesMap.get(s.id)?.business_name || s.id,
      }));
      setRows(withNames);
      setTotal(withNames.length);
      if (userId) {
        const rank = withNames.find((r: { id: string; rank: number }) => r.id === userId)?.rank ?? null;
        setUserRank(rank);
      }
    };
    load();
  }, [userId]);
  return { rows, userRank, total };
}
