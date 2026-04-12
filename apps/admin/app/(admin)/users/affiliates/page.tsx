'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/admin-client';

export default function Page() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'affiliate').then(({ data }) => setUsers(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Affiliates</h1>
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Phone</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-soft">
                <td className="py-3">{u.full_name}</td>
                <td className="py-3">{u.phone_number}</td>
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
                  No affiliates yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
