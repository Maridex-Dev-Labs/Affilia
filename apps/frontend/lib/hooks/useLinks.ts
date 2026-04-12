'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';

export function useLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('affiliate_links')
      .select('*')
      .eq('affiliate_id', user.id)
      .then(({ data }) => {
        setLinks(data || []);
        setLoading(false);
      });
  }, [user]);

  return { links, loading };
}
