'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { PrimaryButton } from '@/components/ui/Button';

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePassword = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setIsSubmitting(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase
        .from('profiles')
        .update({
          must_change_password: false,
          last_password_changed_at: new Date().toISOString(),
        })
        .eq('id', userData.user.id);
    }

    setDone(true);
    setIsSubmitting(false);
    const next = searchParams.get('next');
    if (next) {
      router.push(next);
    }
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6">
      <div className="max-w-md card-surface p-8">
        <h1 className="text-3xl font-bold">Set New Password</h1>
        <input
          className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm mt-6"
          placeholder="New Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        {done && <p className="text-xs text-green-400 mt-2">Password updated.</p>}
        <PrimaryButton className="w-full mt-4" loading={isSubmitting} loadingText="Updating..." onClick={updatePassword}>
          Update Password
        </PrimaryButton>
      </div>
    </div>
  );
}
