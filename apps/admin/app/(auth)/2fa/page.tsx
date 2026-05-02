'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/admin-client';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import { PrimaryButton } from '@/components/shared/AdminButton';
import BrandLogo from '@/components/shared/BrandLogo';

export default function Page() {
  const router = useRouter();
  const { user, loading } = useAdminAuth();
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const setup = async () => {
      if (loading) return;
      if (!user) {
        router.replace('/login');
        return;
      }

      const [{ data: adminRecord, error: adminError }, { data: profile }] = await Promise.all([
        supabase
          .from('admin_users')
          .select('requires_totp, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle(),
        supabase.from('profiles').select('must_change_password').eq('id', user.id).maybeSingle(),
      ]);

      if (adminError || !adminRecord) {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      if (profile?.must_change_password) {
        router.replace('/force-password-reset');
        return;
      }

      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel === 'aal2') {
        router.replace('/overview');
        return;
      }

      if (!adminRecord.requires_totp) {
        router.replace('/overview');
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const existing = factors?.totp?.[0];
      if (existing) {
        setFactorId(existing.id);
        const { data, error } = await supabase.auth.mfa.challenge({ factorId: existing.id });
        if (error) return setError(error.message);
        setChallengeId(data.id);
        return;
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) return setError(error.message);
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      const challenge = await supabase.auth.mfa.challenge({ factorId: data.id });
      if (challenge.error) return setError(challenge.error.message);
      setChallengeId(challenge.data.id);
    };
    setup();
  }, [loading, router, user]);

  const verify = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setError('');
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    if (error) {
      setError(error.message);
      setIsVerifying(false);
      return;
    }
    router.push('/overview');
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6">
      <div className="max-w-md card-surface p-8">
        <BrandLogo className="mb-6" markClassName="h-14 w-14" textClassName="text-2xl font-black italic text-white" priority />
        <h1 className="text-3xl font-bold">Two-Factor Setup</h1>
        <p className="text-muted mt-2">Scan the QR code with an authenticator app.</p>
        {qr && <img className="mt-4 rounded-xl" src={qr} alt="TOTP QR" />}
        <input
          className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm mt-6"
          placeholder="Enter 6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        <PrimaryButton className="w-full mt-4" loading={isVerifying} loadingText="Verifying..." onClick={verify}>
          Verify & Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
