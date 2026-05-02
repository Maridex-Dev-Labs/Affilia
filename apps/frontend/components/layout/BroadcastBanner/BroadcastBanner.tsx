'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function BroadcastBanner({ profile }: { profile: any }) {
  const [broadcast, setBroadcast] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!profile) {
        setBroadcast(null);
        return;
      }

      try {
        const audience = profile.role || 'all';
        const { data, error } = await supabase
          .from('broadcasts')
          .select('*')
          .or(`audience.eq.all,audience.eq.${audience}`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          setBroadcast(null);
          return;
        }

        setBroadcast(data?.[0] || null);
      } catch {
        setBroadcast(null);
      }
    };
    void load();
  }, [profile]);

  if (!broadcast) return null;

  return (
    <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-2 text-xs">
      <span className="font-semibold mr-2">{broadcast.title}</span>
      <span className="text-muted">{broadcast.message}</span>
    </div>
  );
}
