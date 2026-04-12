'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function Page() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('conversions')
      .select('created_at, order_value_kes')
      .eq('merchant_id', user.id)
      .then(({ data }) => {
        const map = new Map<string, number>();
        (data || []).forEach((c) => {
          const day = new Date(c.created_at).toLocaleDateString();
          map.set(day, (map.get(day) || 0) + (c.order_value_kes || 0));
        });
        setData(Array.from(map.entries()).map(([date, value]) => ({ date, value })));
      });
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>
      <div className="card-surface p-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#009A44" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
