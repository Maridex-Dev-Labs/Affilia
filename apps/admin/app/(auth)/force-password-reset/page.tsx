'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase/admin-client';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import { PrimaryButton } from '@/components/shared/AdminButton';
import BrandLogo from '@/components/shared/BrandLogo';

export default function Page() {
  const router = useRouter();
  const { user } = useAdminAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePassword = async () => {
    if (isSubmitting) return;
    if (!user) {
      setError('No admin session found.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      setError(authError.message);
      setIsSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        must_change_password: false,
        last_password_changed_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      setError(profileError.message);
      setIsSubmitting(false);
      return;
    }

    const { data: adminRecord } = await supabase
      .from('admin_users')
      .select('requires_totp')
      .eq('user_id', user.id)
      .maybeSingle();

    router.replace(adminRecord?.requires_totp ? '/2fa' : '/overview');
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md card-surface p-8">
        <BrandLogo className="mb-6" markClassName="h-14 w-14" textClassName="text-2xl font-black italic text-white" priority />
        <h1 className="text-3xl font-bold">Change Temporary Password</h1>
        <p className="text-muted mt-2">This account was provisioned by the super admin. You must set a new password before entering the admin console.</p>
        <div className="mt-6 space-y-4">
          <input
            className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm"
            placeholder="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm"
            placeholder="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <PrimaryButton className="w-full" loading={isSubmitting} loadingText="Updating..." onClick={updatePassword}>
            Update Password
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
