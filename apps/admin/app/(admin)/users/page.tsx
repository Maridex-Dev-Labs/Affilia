'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/admin-client';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

export default function Page() {
  const { can, loading: accessLoading } = useAdminAccess();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => setUsers(data || []));
  }, []);


  if (accessLoading) return <div className="text-muted">Loading access...</div>;
  if (!can('user.manage')) return <div className="card-surface p-6 text-sm text-muted">You do not have permission to access platform users.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users</h1>
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Role</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-soft">
                <td className="py-3">{u.full_name || u.business_name}</td>
                <td className="py-3">{u.role}</td>
                <td className="py-3">
                  <Link className="underline" href={`/users/${u.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-muted">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
