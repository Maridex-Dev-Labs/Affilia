'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import { formatAccountDate, getAccountControl } from '@/lib/account/status';
import KenyanShieldLoader from '@/components/shared/KenyanShieldLoader';

export default function Page() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [resolverTimedOut, setResolverTimedOut] = useState(false);
  const accountControl = getAccountControl(profile?.documents);

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      setResolverTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => setResolverTimedOut(true), 6000);
    return () => window.clearTimeout(timer);
  }, [authLoading, profileLoading]);

  useEffect(() => {
    if (authLoading || profileLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (accountControl.status === 'blocked') {
      return;
    }

    if (profile?.role === 'merchant') {
      router.replace('/merchant/overview');
      return;
    }

    if (profile?.role === 'affiliate') {
      router.replace('/affiliate/overview');
      return;
    }
  }, [accountControl.status, authLoading, profile, profileLoading, router, user]);

  if ((authLoading || profileLoading) && !resolverTimedOut) {
    return (
      <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center">
        <KenyanShieldLoader label="Preparing your account..." />
      </div>
    );
  }

  if (accountControl.status === 'blocked') {
    return (
      <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl card-surface p-8">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Account blocked</div>
          <h1 className="mt-3 text-3xl font-black italic text-white">This account is currently blocked.</h1>
          <p className="mt-4 text-sm leading-6 text-[#9aa2b5]">
            {accountControl.block_reason || 'Please contact support if you believe this was applied in error.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl card-surface p-8">
        <div className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">
          {resolverTimedOut ? 'Account recovery' : 'Account'}
        </div>
        <h1 className="mt-3 text-3xl font-black italic text-white">
          {resolverTimedOut ? 'We could not place you in the right workspace yet.' : 'Your account is ready.'}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#9aa2b5]">
          {resolverTimedOut
            ? 'Choose the workspace you need below. This avoids the loading loop and lets you keep working while the account resolver catches up.'
            : 'Onboarding only runs during signup. If you still want to finish account setup, you can continue it manually below.'}
        </p>
        {accountControl.status === 'scheduled_for_deletion' ? (
          <p className="mt-4 text-sm leading-6 text-[#f5c2c2]">
            Account deletion is scheduled for {formatAccountDate(accountControl.scheduled_for) || 'the end of the grace period'} unless you cancel it from Settings.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/affiliate/overview" className="button-primary rounded-full px-5 py-3 text-sm font-semibold">
            Open Affiliate Workspace
          </Link>
          <Link href="/merchant/overview" className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
            Open Merchant Workspace
          </Link>
          <Link href="/onboarding/role-selection" className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
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
