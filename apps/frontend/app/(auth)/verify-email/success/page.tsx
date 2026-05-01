'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import BrandLogo from '@/components/shared/BrandLogo';

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => {
    const value = searchParams.get('next');
    return value && value.startsWith('/') ? value : '/onboarding/role-selection';
  }, [searchParams]);
  const [secondsLeft, setSecondsLeft] = useState(4);

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      router.replace(next);
    }, 4000);
    const countdown = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => {
      window.clearTimeout(redirectTimer);
      window.clearInterval(countdown);
    };
  }, [next, router]);

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl card-surface p-8 text-center">
        <BrandLogo className="mb-6 justify-center" markClassName="h-14 w-14" textClassName="text-2xl font-black italic text-white" priority />
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#009A44]/25 bg-[#009A44]/12 text-3xl font-black text-[#9ed4b2]">✓</div>
        <h1 className="mt-6 text-4xl font-black italic">Email verified</h1>
        <p className="mt-4 text-sm leading-6 text-[#9aa2b5]">
          Your account is confirmed. Affilia will redirect you automatically in {secondsLeft} second{secondsLeft === 1 ? '' : 's'}.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <PrimaryButton href={next}>Continue Now</PrimaryButton>
          <SecondaryButton href="/dashboard">Go to Dashboard</SecondaryButton>
        </div>
      </div>
    </div>
  );
}
