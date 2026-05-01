'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

const allowedOtpTypes = new Set<EmailOtpType>(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']);

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Confirming your account...');
  const [error, setError] = useState<string | null>(null);

  const flow = searchParams.get('flow') || 'oauth';
  const nextPath = useMemo(() => {
    const next = searchParams.get('next');
    if (!next || !next.startsWith('/')) {
      return flow === 'signup' ? '/onboarding/role-selection' : '/dashboard';
    }
    return next;
  }, [flow, searchParams]);

  useEffect(() => {
    let active = true;

    const completeAuth = async () => {
      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type') as EmailOtpType | null;

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type && allowedOtpTypes.has(type)) {
          const { error: otpError } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
          if (otpError) throw otpError;
        } else {
          throw new Error('Verification link is incomplete or has already been used.');
        }

        if (!active) return;
        if (flow === 'signup') {
          setMessage('Email verified. Preparing your account...');
          router.replace(`/verify-email/success?next=${encodeURIComponent(nextPath)}`);
          return;
        }

        setMessage('Authentication confirmed. Redirecting...');
        router.replace(nextPath);
      } catch (err: any) {
        if (!active) return;
        setError(err.message || 'We could not complete verification. Request a fresh link and try again.');
        setMessage('Verification failed');
      }
    };

    completeAuth();
    return () => {
      active = false;
    };
  }, [flow, nextPath, router, searchParams]);

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg card-surface p-8 text-center">
        <div className="mx-auto mb-5 h-16 w-16 rounded-full border border-[#009A44]/30 bg-[#009A44]/10" />
        <h1 className="text-3xl font-black italic">{message}</h1>
        <p className="mt-3 text-sm text-[#9aa2b5]">
          {error || 'Hold on for a moment while Affilia validates the link and restores your session.'}
        </p>
      </div>
    </div>
  );
}
