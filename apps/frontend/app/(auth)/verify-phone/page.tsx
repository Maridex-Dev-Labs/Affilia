'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PrimaryButton } from '@/components/ui/Button';

export default function Page() {
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const sendOtp = async () => {
    if (isSending) return;
    setIsSending(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({ phone });
    if (err) {
      setError(err.message);
      setIsSending(false);
      return;
    }
    setSent(true);
    setIsSending(false);
  };

  const verifyOtp = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (err) {
      setError(err.message);
      setIsVerifying(false);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6">
      <div className="max-w-md card-surface p-8">
        <h1 className="text-3xl font-bold">Verify Phone</h1>
        <p className="text-muted mt-2">Required for M-Pesa payouts.</p>
        <input
          className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm mt-6"
          placeholder="Phone (e.g. 2547xxxxxxxx)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {sent && (
          <input
            className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm mt-3"
            placeholder="OTP Code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        )}
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        {!sent ? (
          <PrimaryButton className="w-full mt-4" loading={isSending} loadingText="Sending OTP..." onClick={sendOtp}>
            Send OTP
          </PrimaryButton>
        ) : (
          <PrimaryButton className="w-full mt-4" loading={isVerifying} loadingText="Verifying..." onClick={verifyOtp}>
            Verify
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
