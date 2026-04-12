'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PrimaryButton } from '@/components/ui/Button';

export default function Page() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendReset = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (err) {
      setError(err.message);
      setIsSubmitting(false);
      return;
    }
    setSent(true);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6">
      <div className="max-w-md card-surface p-8">
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="text-muted mt-2">We’ll email you a reset link.</p>
        <input
          className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm mt-6"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        {sent && <p className="text-xs text-green-400 mt-2">Email sent.</p>}
        <PrimaryButton className="w-full mt-4" loading={isSubmitting} loadingText="Sending..." onClick={sendReset}>
          Send Reset Link
        </PrimaryButton>
      </div>
    </div>
  );
}
