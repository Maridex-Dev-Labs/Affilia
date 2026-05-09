'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/admin-client';
import { adminApi } from '@/lib/api/admin';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

function getAccountStatus(user: any) {
  return user?.documents?.account_control?.status || 'active';
}

export default function Page() {
  const { can, loading: accessLoading } = useAdminAccess();
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const act = async (kind: 'warn' | 'block' | 'restore' | 'revoke' | 'scheduleDelete' | 'cancelDelete' | 'deleteNow', profileId: string) => {
    setError(null);
    try {
      if (kind === 'warn') {
        const message = window.prompt('Warning message for this user?');
        if (!message?.trim()) return;
        await adminApi.warnUser(profileId, { message });
      } else if (kind === 'block') {
        const reason = window.prompt('Reason for blocking this user?');
        if (!reason?.trim()) return;
        await adminApi.blockUser(profileId, { reason });
      } else if (kind === 'restore') {
        await adminApi.restoreUser(profileId);
      } else if (kind === 'revoke') {
        const reason = window.prompt('Reason for revoking paid or verification privileges?');
        if (!reason?.trim()) return;
        await adminApi.revokeUser(profileId, { reason });
      } else if (kind === 'scheduleDelete') {
        const reason = window.prompt('Reason for scheduling deletion?');
        if (!reason?.trim()) return;
        await adminApi.scheduleUserDeletion(profileId, { reason });
      } else if (kind === 'cancelDelete') {
        await adminApi.cancelUserDeletion(profileId);
      } else if (kind === 'deleteNow') {
        const reason = window.prompt('Reason for immediate deletion? This only succeeds if the account has no blockers.');
        if (!reason?.trim()) return;
        await adminApi.deleteUser(profileId, { reason });
      }
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to update this user.');
    }
  };


  if (accessLoading) return <div className="text-muted">Loading access...</div>;
  if (!can('user.manage')) return <div className="card-surface p-6 text-sm text-muted">You do not have permission to access platform users.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users</h1>
      {error ? <div className="card-surface p-4 text-sm text-red-300">{error}</div> : null}
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Role</th>
              <th className="py-2">Account</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-soft">
                <td className="py-3">{u.full_name || u.business_name}</td>
                <td className="py-3">{u.role}</td>
                <td className="py-3 uppercase text-xs">{getAccountStatus(u).replace(/_/g, ' ')}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link className="underline" href={`/users/${u.id}`}>
                      View
                    </Link>
                    <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => act('warn', u.id)}>Warn</button>
                    {getAccountStatus(u) === 'blocked' ? (
                      <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => act('restore', u.id)}>Restore</button>
                    ) : (
                      <button className="text-xs border border-[#BB0000]/30 text-[#f5c2c2] rounded-full px-3 py-1" onClick={() => act('block', u.id)}>Block</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-muted">
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
