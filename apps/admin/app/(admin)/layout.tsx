'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import { supabase } from '@/lib/supabase/admin-client';
import KenyanShieldLoader from '@/components/shared/KenyanShieldLoader/KenyanShieldLoader';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAdminAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      if (loading) return;

      if (!user) {
        router.replace('/login');
        return;
      }

      const [{ data, error }, { data: profile }] = await Promise.all([
        supabase
          .from('admin_users')
          .select('id, requires_totp, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle(),
        supabase.from('profiles').select('must_change_password').eq('id', user.id).maybeSingle(),
      ]);

      if (error || !data) {
        await supabase.auth.signOut();
        document.cookie = 'affilia_admin_2fa=; Max-Age=0; path=/';
        router.replace('/login');
        return;
      }

      if (profile?.must_change_password) {
        router.replace('/force-password-reset');
        return;
      }

      const has2fa = document.cookie.includes('affilia_admin_2fa=1');
      if (data.requires_totp && !has2fa) {
        router.replace('/2fa');
        return;
      }

      setAuthorized(true);
    };

    verifyAdmin();
  }, [loading, router, user]);

  if (loading || !authorized) {
    return (
      <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center">
        <KenyanShieldLoader label="Checking admin access..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kenya-navy text-white">
      <div className="mx-auto flex max-w-[1700px]">
        <AdminSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminHeader />
          <main className="flex-1 px-4 py-6 md:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
