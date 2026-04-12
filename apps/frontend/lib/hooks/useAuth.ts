'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useAuth() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, user: session?.user || null };
}
