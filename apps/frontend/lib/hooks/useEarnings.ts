'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';

export function useEarnings() {
  const { user } = useAuth();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('conversions')
      .select('commission_earned_kes')
      .eq('affiliate_id', user.id)
      .then(({ data }) => {
        const sum = (data || []).reduce((acc, cur: any) => acc + (cur.commission_earned_kes || 0), 0);
        setTotal(sum);
        setLoading(false);
      });
  }, [user]);

  return { total, loading };
}
