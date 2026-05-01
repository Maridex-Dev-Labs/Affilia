'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useAuth() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    const bootstrap = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (active) {
          setSession(data.session);
          setLoading(false);
        }
        const { data: subscription } = supabase.auth.onAuthStateChange((_event, sess) => {
          if (active) setSession(sess);
        });
        unsubscribe = () => subscription.subscription.unsubscribe();
      } catch {
        if (active) {
          setSession(null);
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { session, loading, user: session?.user || null };
}
