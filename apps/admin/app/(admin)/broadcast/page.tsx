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

  const load = async () => {
    const { data } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const send = async () => {
    if (!title || !message || !user) return;
    await supabase.from('broadcasts').insert({
      title,
      message,
      audience,
      created_by: user.id,
    });
    setTitle('');
    setMessage('');
    setAudience('all');
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Broadcasts</h1>

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
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-t border-soft">
                <td className="py-3">{b.title}</td>
                <td className="py-3">{b.audience}</td>
                <td className="py-3">{new Date(b.created_at).toLocaleString('en-KE')}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-muted">
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
