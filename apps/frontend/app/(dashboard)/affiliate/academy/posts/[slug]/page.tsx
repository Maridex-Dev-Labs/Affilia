'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function Page() {
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('academy_posts').select('*').eq('slug', params.slug).maybeSingle();
      setPost(data);
      if (data) {
        const [{ data: resourceRows }, { data: author }] = await Promise.all([
          supabase.from('academy_resources').select('*').eq('post_id', data.id),
          supabase.from('profiles').select('id, full_name').eq('id', data.author_id).maybeSingle(),
        ]);
        setResources(resourceRows || []);
        setPost({ ...data, author_name: author?.full_name || 'Tutor' });
      }
      setLoading(false);
    };
    load();
  }, [params.slug]);

  if (loading) {
    return <div className="card-surface p-8 text-sm text-muted">Loading lesson...</div>;
  }

  if (!post) {
    return <div className="card-surface p-8 text-sm text-muted">This lesson was not found or you do not have access.</div>;
  }

  return (
    <div className="space-y-6">
      <Link href="/affiliate/academy" className="text-sm text-kenya-green hover:underline">
        Back to Academy
      </Link>
      <article className="card-surface p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
          <span>{post.category}</span>
          <span>{post.access_level}</span>
          <span>{post.status}</span>
        </div>
        <h1 className="mt-4 text-3xl font-black leading-tight">{post.title}</h1>
        <p className="mt-3 text-sm text-white/55">By {post.author_name} · {post.published_at ? new Date(post.published_at).toLocaleString('en-KE') : 'Draft'}</p>
        {post.summary && <p className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted">{post.summary}</p>}
        <div className="prose prose-invert mt-6 max-w-none whitespace-pre-wrap text-sm leading-7 text-white/80">
          {post.content}
        </div>
      </article>
      <section className="card-surface p-6">
        <h2 className="text-xl font-bold">Resources</h2>
        <div className="mt-4 space-y-3">
          {resources.map((resource) => (
            <a key={resource.id} href={resource.resource_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm transition hover:bg-white/[0.05]">
              <span>{resource.title}</span>
              <span className="text-xs uppercase tracking-[0.18em] text-white/45">{resource.resource_type}</span>
            </a>
          ))}
          {resources.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-muted">No resources attached yet.</div>}
        </div>
      </section>
    </div>
  );
}
