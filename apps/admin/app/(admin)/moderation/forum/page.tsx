'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';
import { logAdminAction } from '@/lib/security/audit-logger';

export default function Page() {
  const [posts, setPosts] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from('forum_posts').select('*').order('created_at', { ascending: false });
    setPosts(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: string) => {
    await supabase.from('forum_posts').update({ status }).eq('id', id);
    await logAdminAction('forum_update', 'forum_post', id);
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Forum Moderation</h1>
      <div className="card-surface p-6 space-y-4">
        {posts.map((p) => (
          <div key={p.id} className="border-b border-soft pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-xs text-muted">{new Date(p.created_at).toLocaleString('en-KE')}</p>
              </div>
              <div className="text-xs text-muted capitalize">{p.status}</div>
            </div>
            <p className="text-sm text-muted mt-2">{p.content}</p>
            <div className="mt-3 flex gap-2">
              <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => setStatus(p.id, 'approved')}>
                Approve
              </button>
              <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => setStatus(p.id, 'hidden')}>
                Hide
              </button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <div className="text-muted">No forum posts yet.</div>}
      </div>
    </div>
  );
}
