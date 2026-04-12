'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(async ({ data, error }) => {
        if (!data && error) {
          const { data: created } = await supabase.from('profiles').upsert({
            id: user.id,
            full_name: user.user_metadata?.full_name ?? '',
            role: null,
            onboarding_complete: false,
          }).select('*').single();
          setProfile(created);
        } else {
          setProfile(data);
        }
        setLoading(false);
      });
  }, [user]);

  return { profile, loading };
}
