import Link from 'next/link';

import { blogPosts } from '@/lib/content/blog';

export default function BlogIndex() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">Blog</h1>
        <p className="text-muted">
          Practical guides for Kenyan merchants, affiliates, and tutors building consistent online revenue.
        </p>
      </div>

      <div className="mt-10 grid gap-6">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="card-surface block rounded-[2rem] p-6 transition hover:-translate-y-1 hover:border-white/15"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8f98ab]">
              <span>{post.category}</span>
              <span>{post.readTime}</span>
              <span>{new Date(post.publishedAt).toLocaleDateString('en-KE')}</span>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-white">{post.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[#cfd5e1]">{post.excerpt}</p>
            <div className="mt-5 text-sm font-semibold text-[#009A44]">Read article</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
