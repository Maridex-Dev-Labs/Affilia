'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user) {
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!data && error) {
          const { data: created } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              full_name: user.user_metadata?.full_name ?? '',
              role: null,
              onboarding_complete: false,
            })
            .select('*')
            .single();
          if (active) setProfile(created || null);
        } else if (active) {
          setProfile(data || null);
        }
      } catch {
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    setLoading(true);
    load();

    const channel = user
      ? supabase
          .channel(`profile:${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, load)
          .subscribe()
      : null;

    return () => {
      active = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [user]);

  return { profile, loading };
}
