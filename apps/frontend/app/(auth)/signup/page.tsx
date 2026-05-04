'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildAuthRedirect } from '@/lib/auth/redirects';
import { supabase } from '@/lib/supabase/client';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import BrandLogo from '@/components/shared/BrandLogo';

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<'google' | 'azure' | null>(null);

  const signUp = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: buildAuthRedirect('/auth/callback?flow=signup&next=/onboarding/role-selection'),
      },
    });
    if (err) {
      setError(
        /failed to send confirmation email/i.test(err.message)
          ? 'We could not send the confirmation email right now. Please try again shortly.'
          : err.message,
      );
      setIsSubmitting(false);
      return;
    }
    if (data.session) {
      router.push('/onboarding/role-selection');
    } else {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }
  };

  const oauth = async (provider: 'google' | 'azure') => {
    setOauthProvider(provider);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: buildAuthRedirect('/auth/callback?flow=oauth&next=/dashboard') },
    });
    if (err) {
      setError(err.message);
      setOauthProvider(null);
    }
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md card-surface p-8">
        <BrandLogo className="mb-6" markClassName="h-14 w-14" textClassName="text-2xl font-black italic text-white" priority />
        <div className="mb-6 flex items-center justify-between text-xs font-bold uppercase tracking-[0.24em] text-[#7e869a]">
          <span>Create Account</span>
          <Link href="/login" className="text-[#009A44] hover:text-white">Sign in instead</Link>
        </div>
        <h1 className="text-3xl font-black italic">Join Affilia</h1>
        <p className="text-muted mt-2">Create your account in under two minutes, or continue with your existing Google or Microsoft identity.</p>

        <div className="mt-6 space-y-4">
          <input className="input-shell" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input-shell" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <PrimaryButton className="w-full justify-center" loading={isSubmitting} loadingText="Creating account..." onClick={signUp}>
            Create Account
          </PrimaryButton>
          <div className="grid gap-2">
            <SecondaryButton loading={oauthProvider === 'google'} loadingText="Connecting Google..." onClick={() => oauth('google')}>
              Continue with Google
            </SecondaryButton>
            <SecondaryButton loading={oauthProvider === 'azure'} loadingText="Connecting Microsoft..." onClick={() => oauth('azure')}>
              Continue with Microsoft
            </SecondaryButton>
          </div>
          <div className="pt-3 text-sm text-[#9aa2b5]">
            Already have an account? <Link href="/login" className="text-[#009A44] hover:text-white">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
