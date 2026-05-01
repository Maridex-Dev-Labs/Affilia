'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { PrimaryButton } from '@/components/ui/Button';
import BrandLogo from '@/components/shared/BrandLogo';
import LegalAgreementForm from '@/components/legal/LegalAgreementForm';

const nichesList = ['Fashion', 'Mitumba', 'Electronics', 'Beauty', 'Home', 'Footwear'];
const channelsList = ['WhatsApp', 'Instagram', 'TikTok', 'Facebook', 'YouTube'];

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [niches, setNiches] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [error, setError] = useState('');

  const toggle = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const saveProfileDraft = async () => {
    if (!user) throw new Error('No active user session.');
    const { error: err } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        payout_phone: payoutPhone,
        niches,
        promotion_channels: channels,
      })
      .eq('id', user.id);
    if (err) throw err;
  };

  const finishOnboarding = async () => {
    if (!user) return;
    const { error: err } = await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id);
    if (err) throw err;
    router.push('/affiliate/overview');
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-5xl card-surface p-8">
        <BrandLogo className="mb-6" markClassName="h-14 w-14" textClassName="text-2xl font-black italic text-white" priority />
        <h1 className="text-3xl font-bold">Affiliate Setup</h1>
        <p className="text-muted mt-2">Step {step} of 4</p>

        {step === 1 && (
          <div className="mt-6 space-y-4">
            <input className="input-shell" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <input className="input-shell" placeholder="Payout Phone" value={payoutPhone} onChange={(e) => setPayoutPhone(e.target.value)} />
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-sm text-muted mb-2">Select Niches</p>
              <div className="flex flex-wrap gap-2">
                {nichesList.map((n) => (
                  <button key={n} type="button" className={`px-3 py-1 rounded-full text-xs border ${niches.includes(n) ? 'border-kenya-green' : 'border-white/20'}`} onClick={() => toggle(n, niches, setNiches)}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted mb-2">Promotion Channels</p>
              <div className="flex flex-wrap gap-2">
                {channelsList.map((c) => (
                  <button key={c} type="button" className={`px-3 py-1 rounded-full text-xs border ${channels.includes(c) ? 'border-kenya-green' : 'border-white/20'}`} onClick={() => toggle(c, channels, setChannels)}>{c}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="mt-6">
            <LegalAgreementForm
              agreementType="affiliate"
              mode="onboarding"
              submitLabel="Submit Agreement and Finish"
              beforeSubmit={saveProfileDraft}
              afterSubmit={finishOnboarding}
            />
          </div>
        )}

        {error ? <p className="text-xs text-red-400 mt-4">{error}</p> : null}

        {step < 4 ? (
          <div className="mt-6 flex justify-between">
            <button className="border border-white/20 rounded-full px-4 py-2 text-xs" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>Back</button>
            <PrimaryButton onClick={() => setStep((s) => s + 1)}>Next</PrimaryButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
