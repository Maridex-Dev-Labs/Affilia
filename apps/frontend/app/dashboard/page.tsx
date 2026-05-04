'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import KenyanShieldLoader from '@/components/shared/KenyanShieldLoader';

export default function Page() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  useEffect(() => {
    if (authLoading || profileLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (profile?.role === 'merchant') {
      router.replace('/merchant/overview');
      return;
    }

    if (profile?.role === 'affiliate') {
      router.replace('/affiliate/overview');
    }
  }, [authLoading, profile, profileLoading, router, user]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center">
        <KenyanShieldLoader label="Preparing your account..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl card-surface p-8">
        <div className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Account</div>
        <h1 className="mt-3 text-3xl font-black italic text-white">Your account is ready.</h1>
        <p className="mt-4 text-sm leading-6 text-[#9aa2b5]">
          Onboarding only runs during signup. If you still want to finish account setup, you can continue it manually below.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/onboarding/role-selection" className="button-primary rounded-full px-5 py-3 text-sm font-semibold">
            Continue Onboarding
          </Link>
          <Link href="/" className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
