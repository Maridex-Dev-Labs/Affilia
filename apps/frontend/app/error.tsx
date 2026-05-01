'use client';

export default function Error() {
  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="text-muted mt-2">This workspace is temporarily unavailable. Please try again later.</p>
      </div>
    </div>
  );
}
