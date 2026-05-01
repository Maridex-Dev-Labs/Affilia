import BrandLogo from '@/components/shared/BrandLogo';

export default function Page() {
  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6">
      <div className="max-w-md card-surface p-8 text-center">
        <BrandLogo className="mb-6 justify-center" markClassName="h-14 w-14" textClassName="text-2xl font-black italic text-white" priority />
        <h1 className="text-3xl font-bold">Verification</h1>
        <p className="text-muted mt-2">Your admin session is verified.</p>
      </div>
    </div>
  );
}
