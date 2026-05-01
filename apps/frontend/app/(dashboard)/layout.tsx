'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import MobileNav from '@/components/layout/MobileNav';
import BroadcastBanner from '@/components/layout/BroadcastBanner/BroadcastBanner';
import KenyanShieldLoader from '@/components/shared/KenyanShieldLoader';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!profileLoading && profile && !profile.onboarding_complete) {
      router.push('/onboarding/role-selection');
    }
  }, [profileLoading, profile, router]);

  useEffect(() => {
    if (!profileLoading && profile?.must_change_password) {
      router.push('/update-password?next=/dashboard');
    }
  }, [profile, profileLoading, router]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center">
        <KenyanShieldLoader label="Preparing your workspace..." />
      </div>
    );
  }

  return (
    <div className="dashboard-shell min-h-screen bg-kenya-navy text-white">
      <div className="flex max-w-[1600px] mx-auto w-full">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar />
          <div className="px-4 md:px-8 pt-4">
            <BroadcastBanner />
          </div>
          <motion.main
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8"
          >
            <div className="mx-auto max-w-6xl">{children}</div>
          </motion.main>
          <MobileNav />
        </div>
      </div>
    </div>
  );
}
