import { notFound } from 'next/navigation';

import { blogPosts, getBlogPost } from '@/lib/content/blog';

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f98ab]">
        {post.category} · {post.readTime} · {new Date(post.publishedAt).toLocaleDateString('en-KE')}
      </div>
      <h1 className="mt-4 text-4xl font-bold mb-4">{post.title}</h1>
      <p className="text-lg text-muted">{post.excerpt}</p>

      <div className="mt-10 space-y-10">
        {post.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-2xl font-semibold text-white">{section.heading}</h2>
            <div className="mt-4 space-y-4 text-base leading-8 text-[#cfd5e1]">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
