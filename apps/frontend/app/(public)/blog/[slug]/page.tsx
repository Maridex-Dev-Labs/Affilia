export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-4">{slug.replace('-', ' ')}</h1>
      <p className="text-muted">Post content coming soon.</p>
    </div>
  );
}
