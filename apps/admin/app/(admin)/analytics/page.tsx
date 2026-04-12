'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

export default function Page() {
  const [stats, setStats] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: conversions } = await supabase
        .from('conversions')
        .select('order_value_kes, platform_fee_kes, created_at');
      const { data: clicks } = await supabase.from('click_events').select('id, clicked_at');

      const totalSales = (conversions || []).reduce((acc, c) => acc + (c.order_value_kes || 0), 0);
      const totalRevenue = (conversions || []).reduce((acc, c) => acc + (c.platform_fee_kes || 0), 0);
      const totalClicks = (clicks || []).length;

      setStats([
        { label: 'Total Sales (KES)', value: totalSales },
        { label: 'Platform Revenue (KES)', value: totalRevenue },
        { label: 'Total Clicks', value: totalClicks },
      ]);

      const days: { [key: string]: any } = {};
      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days[key] = { date: key, sales: 0, revenue: 0, clicks: 0 };
      }
      (conversions || []).forEach((c) => {
        const key = new Date(c.created_at).toISOString().slice(0, 10);
        if (days[key]) {
          days[key].sales += c.order_value_kes || 0;
          days[key].revenue += c.platform_fee_kes || 0;
        }
      });
      (clicks || []).forEach((c) => {
        const key = new Date(c.clicked_at).toISOString().slice(0, 10);
        if (days[key]) {
          days[key].clicks += 1;
        }
      });
      setDaily(Object.values(days));
    };
    load();
  }, []);

  const chartData = useMemo(() => daily, [daily]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card-surface p-5">
            <p className="text-sm text-muted">{s.label}</p>
            <div className="text-2xl font-bold mt-2">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h3 className="text-lg font-bold mb-4">Sales (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: '#A0AEC0', fontSize: 11 }} />
                <YAxis tick={{ fill: '#A0AEC0', fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#009A44" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-surface p-6">
          <h3 className="text-lg font-bold mb-4">Clicks (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: '#A0AEC0', fontSize: 11 }} />
                <YAxis tick={{ fill: '#A0AEC0', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="clicks" fill="#BB0000" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
