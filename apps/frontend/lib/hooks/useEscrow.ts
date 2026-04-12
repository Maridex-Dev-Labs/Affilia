'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';

export function useEscrow() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('merchant_escrow')
      .select('*')
      .eq('merchant_id', user.id)
      .single()
      .then(({ data }) => {
        setBalance(data?.balance_kes || 0);
        setLoading(false);
      });
  }, [user]);

  return { balance, loading };
}
