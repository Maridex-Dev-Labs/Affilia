export default function BlogPost({ params }: { params: { slug: string } }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-4">{params.slug.replace('-', ' ')}</h1>
      <p className="text-muted">Post content coming soon.</p>
    </div>
  );
}
