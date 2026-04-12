'use client';

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="text-muted mt-2">{error.message}</p>
      </div>
    </div>
  );
}
