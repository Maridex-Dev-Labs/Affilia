'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';

export default function Page() {
  const { user } = useAdminAuth();
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'all' | 'merchant' | 'affiliate'>('all');
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const send = async () => {
    if (!title || !message || !user) return;
    setStatus(null);
    const { error } = await supabase.from('broadcasts').insert({
      title,
      message,
      audience,
      created_by: user.id,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setTitle('');
    setMessage('');
    setAudience('all');
    setStatus('Broadcast sent.');
    load();
  };

  const remove = async (broadcastId: string) => {
    setBusyId(broadcastId);
    setStatus(null);
    const { error } = await supabase.from('broadcasts').delete().eq('id', broadcastId);
    setBusyId(null);
    if (error) {
      setStatus(error.message);
      return;
    }
    setItems((current) => current.filter((item) => item.id !== broadcastId));
    setStatus('Broadcast deleted.');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Broadcasts</h1>

      {status ? <div className="card-surface p-4 text-sm text-muted">{status}</div> : null}

      <div className="card-surface p-6 space-y-4">
        <h3 className="text-lg font-bold">Send Broadcast</h3>
        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm min-h-[120px]"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <select
          className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
          value={audience}
          onChange={(e) => setAudience(e.target.value as any)}
        >
          <option value="all">All Users</option>
          <option value="merchant">Merchants</option>
          <option value="affiliate">Affiliates</option>
        </select>
        <button className="border border-white/20 rounded-full px-4 py-2 text-xs" onClick={send}>
          Send Broadcast
        </button>
      </div>

      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Title</th>
              <th className="py-2">Audience</th>
              <th className="py-2">Created</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-t border-soft">
                <td className="py-3">{b.title}</td>
                <td className="py-3">{b.audience}</td>
                <td className="py-3">{new Date(b.created_at).toLocaleString('en-KE')}</td>
                <td className="py-3 text-right">
                  <button
                    className="rounded-full border border-red-400/40 px-4 py-2 text-xs text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => remove(b.id)}
                    disabled={busyId === b.id}
                  >
                    {busyId === b.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-muted">
                  No broadcasts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
