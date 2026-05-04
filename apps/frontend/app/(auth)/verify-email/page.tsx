'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { buildAuthRedirect } from '@/lib/auth/redirects';
import { supabase } from '@/lib/supabase/client';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import BrandLogo from '@/components/shared/BrandLogo';

export default function Page() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const maskedEmail = useMemo(() => {
    if (!email.includes('@')) return email || 'your inbox';
    const [name, domain] = email.split('@');
    const visible = name.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
  }, [email]);

  const resend = async () => {
    if (!email || sending) return;
    setSending(true);
    setStatus(null);
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: buildAuthRedirect('/auth/callback?flow=signup&next=/onboarding/role-selection'),
      },
    });
    if (resendError) {
      setError(
        /failed to send confirmation email/i.test(resendError.message)
          ? 'We could not resend the confirmation email right now. Please try again shortly.'
          : resendError.message,
      );
    } else {
      setStatus('A fresh verification email has been sent. Check your inbox and spam folder.');
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl card-surface p-8">
        <BrandLogo className="mb-6" markClassName="h-14 w-14" textClassName="text-2xl font-black italic text-white" priority />
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#009A44]/20 bg-[#009A44]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9ed4b2]">
              Verification Pending
            </div>
            <h1 className="text-4xl font-black italic">Check your email</h1>
            <p className="mt-4 text-sm leading-6 text-[#9aa2b5]">
              We sent a confirmation link to <span className="font-bold text-white">{maskedEmail}</span>. Open the message and click the link to activate your account.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-[#cfd6e3]">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">1. Open the email from Affilia.</div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">2. Click the verification link on the same device if possible.</div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">3. We will confirm the link and redirect you into onboarding automatically.</div>
            </div>
          </div>
          <div className="rounded-[1.8rem] border border-white/8 bg-black/25 p-6">
            <h2 className="text-lg font-bold text-white">Didn’t get the email?</h2>
            <p className="mt-3 text-sm text-[#9aa2b5]">Wait a minute, then resend a fresh confirmation link. Also check Promotions and Spam.</p>
            {status ? <p className="mt-4 text-sm text-[#9ed4b2]">{status}</p> : null}
            {error ? <p className="mt-4 text-sm text-[#ffb0b0]">{error}</p> : null}
            <div className="mt-6 grid gap-3">
              <PrimaryButton disabled={!email} loading={sending} loadingText="Sending..." onClick={resend}>
                Resend Verification Email
              </PrimaryButton>
              <SecondaryButton href="/login">Back to Login</SecondaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
