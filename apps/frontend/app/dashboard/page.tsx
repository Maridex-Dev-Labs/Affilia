'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/lib/hooks/useProfile';

export default function Page() {
  const router = useRouter();
  const { profile, loading } = useProfile();

  useEffect(() => {
    if (!loading && profile) {
      if (profile.role === 'merchant') router.push('/merchant/overview');
      if (profile.role === 'affiliate') router.push('/affiliate/overview');
    }
  }, [loading, profile, router]);

  return <div className="min-h-screen bg-kenya-navy text-white p-6">Loading...</div>;
}
