'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';

export default function Page() {
  const [posts, setPosts] = useState<any[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('academy_posts').select('*').order('created_at', { ascending: false });
    const postsData = data || [];
    const authorIds = postsData.map((post) => post.author_id);
    let profileMap: Record<string, any> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', authorIds);
      profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]));
    }
    setPosts(postsData.map((post) => ({ ...post, author_name: profileMap[post.author_id]?.full_name || 'Tutor' })));
  };

  useEffect(() => {
    load();
  }, []);

  const updatePost = async (post: any, changes: any, key: string) => {
    if (pendingId) return;
    setPendingId(post.id + key);
    await supabase.from('academy_posts').update(changes).eq('id', post.id);
    await load();
    setPendingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Academy Posts</h1>
        <p className="mt-2 text-sm text-muted">Moderate and feature tutor guidance posts.</p>
      </div>
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="card-surface p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
                  <span>{post.status}</span>
                  <span>{post.access_level}</span>
                  <span>{post.category}</span>
                  {post.featured && <span className="text-kenya-green">featured</span>}
                </div>
                <h2 className="mt-2 text-xl font-bold">{post.title}</h2>
                <p className="mt-2 text-sm text-muted">By {post.author_name}</p>
                <p className="mt-4 whitespace-pre-wrap text-sm text-white/75">{post.summary || post.content.slice(0, 240)}</p>
              </div>
              <div className="flex flex-wrap gap-3 xl:w-72 xl:justify-end">
                <button onClick={() => updatePost(post, { status: 'published', published_at: post.published_at || new Date().toISOString() }, 'publish')} disabled={!!pendingId} className="rounded-full bg-kenya-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pendingId === post.id + 'publish' ? 'Saving...' : 'Publish'}</button>
                <button onClick={() => updatePost(post, { status: 'archived' }, 'archive')} disabled={!!pendingId} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pendingId === post.id + 'archive' ? 'Saving...' : 'Archive'}</button>
                <button onClick={() => updatePost(post, { featured: !post.featured }, 'feature')} disabled={!!pendingId} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-60">{pendingId === post.id + 'feature' ? 'Saving...' : post.featured ? 'Unfeature' : 'Feature'}</button>
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-8 text-sm text-muted">No academy posts yet.</div>}
      </div>
    </div>
  );
}
