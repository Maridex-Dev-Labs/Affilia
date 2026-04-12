'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('conversions')
      .select('id, commission_earned_kes, created_at, status')
      .eq('affiliate_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, [user]);

  const total = rows.reduce((acc, r) => acc + (r.commission_earned_kes || 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Earnings</h1>
      <div className="card-surface p-6">
        <div className="text-sm text-muted">Total Earnings</div>
        <div className="text-3xl font-bold mt-2">KES {total}</div>
      </div>
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">ID</th>
              <th className="py-2">Commission</th>
              <th className="py-2">Status</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-soft">
                <td className="py-3">{r.id.slice(0, 8)}</td>
                <td className="py-3">KES {r.commission_earned_kes}</td>
                <td className="py-3">{r.status}</td>
                <td className="py-3">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-muted">
                  No earnings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
