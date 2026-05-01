'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/admin-client';
import { PrimaryButton } from '@/components/shared/AdminButton';
import BrandLogo from '@/components/shared/BrandLogo';

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_ADMIN_ACCESS_EMAIL ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signIn = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setIsSubmitting(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      await supabase.auth.signOut();
      setError('No admin session was created.');
      setIsSubmitting(false);
      return;
    }

    const [{ data: adminRecord, error: adminError }, { data: profile }] = await Promise.all([
      supabase
        .from('admin_users')
        .select('id, status, requires_totp')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle(),
      supabase.from('profiles').select('must_change_password').eq('id', userId).maybeSingle(),
    ]);

    if (adminError || !adminRecord) {
      await supabase.auth.signOut();
      setError('This account does not have admin access.');
      setIsSubmitting(false);
      return;
    }

    if (profile?.must_change_password) {
      router.push('/force-password-reset');
      return;
    }

    router.push(adminRecord.requires_totp ? '/2fa' : '/overview');
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md card-surface p-8">
        <BrandLogo className="mb-6" markClassName="h-14 w-14" textClassName="text-2xl font-black italic text-white" priority />
        <h1 className="text-3xl font-bold">Admin Sign In</h1>
        <p className="text-muted mt-2">Restricted access</p>
        <div className="mt-6 space-y-4">
          <input
            className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <PrimaryButton className="w-full" loading={isSubmitting} loadingText="Signing in..." onClick={signIn}>
            Sign In
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
