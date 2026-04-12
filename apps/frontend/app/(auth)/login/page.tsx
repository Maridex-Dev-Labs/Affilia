'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<'google' | 'azure' | null>(null);

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
      setError('No session was created.');
      setIsSubmitting(false);
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('must_change_password').eq('id', userId).maybeSingle();
    router.push(profile?.must_change_password ? '/update-password?next=/dashboard' : '/dashboard');
  };

  const oauth = async (provider: 'google' | 'azure') => {
    setOauthProvider(provider);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (err) {
      setError(err.message);
      setOauthProvider(null);
    }
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md card-surface p-8">
        <div className="mb-6 flex items-center justify-between text-xs font-bold uppercase tracking-[0.24em] text-[#7e869a]">
          <span>Access Affilia</span>
          <Link href="/signup" className="text-[#009A44] hover:text-white">Create account</Link>
        </div>
        <h1 className="text-3xl font-black italic">Welcome Back</h1>
        <p className="text-muted mt-2">Sign in to your Affilia account, or create one if you are new here.</p>

        <div className="mt-6 space-y-4">
          <input className="input-shell" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input-shell" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <PrimaryButton className="w-full justify-center" loading={isSubmitting} loadingText="Signing in..." onClick={signIn}>
            Sign In
          </PrimaryButton>
          <div className="grid gap-2">
            <SecondaryButton loading={oauthProvider === 'google'} loadingText="Connecting Google..." onClick={() => oauth('google')}>
              Continue with Google
            </SecondaryButton>
            <SecondaryButton loading={oauthProvider === 'azure'} loadingText="Connecting Microsoft..." onClick={() => oauth('azure')}>
              Continue with Microsoft
            </SecondaryButton>
          </div>
          <div className="flex items-center justify-between pt-3 text-sm text-[#9aa2b5]">
            <Link href="/reset-password" className="hover:text-white">Forgot password?</Link>
            <Link href="/signup" className="hover:text-[#009A44]">Need an account?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
