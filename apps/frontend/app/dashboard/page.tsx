'use client';

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

    if (!profile?.role || profile.onboarding_complete === false) {
      router.replace('/onboarding/role-selection');
      return;
    }

    if (profile.role === 'merchant') {
      router.replace('/merchant/overview');
      return;
    }

    if (profile.role === 'affiliate') {
      router.replace('/affiliate/overview');
      return;
    }

    router.replace('/onboarding/role-selection');
  }, [authLoading, profile, profileLoading, router, user]);

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center">
      <KenyanShieldLoader label="Preparing your account..." />
    </div>
  );
}
