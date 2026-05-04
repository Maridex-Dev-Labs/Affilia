'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import { usePlanAccess } from '@/lib/hooks/usePlanAccess';
import { affiliateNav, merchantNav } from '@/lib/config/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import MobileNav from '@/components/layout/MobileNav';
import BroadcastBanner from '@/components/layout/BroadcastBanner/BroadcastBanner';
import WorkspaceErrorBoundary from '@/components/layout/WorkspaceErrorBoundary';
import KenyanShieldLoader from '@/components/shared/KenyanShieldLoader';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const safePathname = pathname ?? '';
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { canAccessPath, loading: planAccessLoading, isAffiliateVerified, activePlanCode } = usePlanAccess();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!profileLoading && profile?.must_change_password) {
      router.push('/update-password?next=/dashboard');
    }
  }, [profile, profileLoading, router]);

  useEffect(() => {
    if (!profileLoading && user && profile && !profile.role) {
      router.replace('/dashboard');
    }
  }, [profile, profileLoading, router, user]);

  if (loading || profileLoading || planAccessLoading || !safePathname) {
    return (
      <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center">
        <KenyanShieldLoader label="Preparing your workspace..." />
      </div>
    );
  }

  const showWorkspaceGate =
    Boolean(profile?.role && (profile.role === 'merchant' || profile.role === 'affiliate')) &&
    !canAccessPath(safePathname);
  const navItems = profile?.role === 'merchant'
    ? merchantNav.filter((item) => canAccessPath(item.href))
    : profile?.role === 'affiliate'
      ? affiliateNav.filter((item) => canAccessPath(item.href))
      : [];

  return (
    <div className="dashboard-shell min-h-screen bg-kenya-navy text-white">
      <div className="flex max-w-[1600px] mx-auto w-full">
        <Sidebar
          activePlanCode={activePlanCode}
          isAffiliateVerified={isAffiliateVerified}
          items={navItems}
          pathname={safePathname}
          profile={profile}
        />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar profile={profile} />
          <div className="px-4 md:px-8 pt-4">
            <BroadcastBanner profile={profile} />
          </div>
          <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">
            <div className="mx-auto max-w-6xl">
              {showWorkspaceGate ? (
                <div className="card-surface p-8">
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Access Locked</div>
                  <h2 className="mt-3 text-3xl font-black italic text-white">
                    {profile?.role === 'affiliate' && !isAffiliateVerified ? 'Affiliate verification is still required.' : 'Activate the right package to unlock this area.'}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm text-[#9aa2b5]">
                    {profile?.role === 'affiliate' && !isAffiliateVerified
                      ? 'Submit your affiliate verification details in Settings. Link generation, commissions, community access, and payouts unlock immediately after approval.'
                      : activePlanCode
                        ? 'Your current package does not include this section. Upgrade from Settings and the workspace will unlock as soon as admin approves your payment.'
                        : 'Choose a package from Settings. Paid plan approvals and affiliate verification update this workspace immediately after admin approval.'}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={profile?.role === 'affiliate' ? '/affiliate/settings' : '/merchant/settings'} className="button-primary rounded-full px-5 py-3 text-sm font-semibold">
                      Open Settings
                    </Link>
                    <Link href={profile?.role === 'affiliate' ? '/affiliate/overview' : '/merchant/overview'} className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
                      Back to Overview
                    </Link>
                  </div>
                </div>
              ) : (
                <WorkspaceErrorBoundary role={profile?.role}>
                  {children}
                </WorkspaceErrorBoundary>
              )}
            </div>
          </main>
          <MobileNav items={navItems} pathname={safePathname} profile={profile} />
        </div>
      </div>
    </div>
  );
}
