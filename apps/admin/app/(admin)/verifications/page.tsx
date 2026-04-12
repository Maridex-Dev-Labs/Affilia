'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/admin-client';
import { logAdminAction } from '@/lib/security/audit-logger';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

export default function Page() {
  const { can, loading: accessLoading } = useAdminAccess();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'merchant').eq('business_verified', false);
    setItems(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    await supabase.from('profiles').update({ business_verified: true }).eq('id', id);
    await logAdminAction('merchant_verify', 'profile', id);
    load();
  };


  if (accessLoading) return <div className="text-muted">Loading access...</div>;
  if (!can('merchant.verify')) return <div className="card-surface p-6 text-sm text-muted">You do not have permission to access merchant verification requests.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Merchant Verifications</h1>
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Merchant</th>
              <th className="py-2">Phone</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-t border-soft">
                <td className="py-3">
                  <Link className="underline" href={`/verifications/${m.id}`}>
                    {m.business_name || m.full_name}
                  </Link>
                </td>
                <td className="py-3">{m.phone_number}</td>
                <td className="py-3">
                  <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => approve(m.id)}>
                    Approve
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-muted">
                  No pending verifications.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
