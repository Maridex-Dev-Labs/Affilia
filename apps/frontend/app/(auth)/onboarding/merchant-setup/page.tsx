'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { uploadMerchantDoc } from '@/lib/supabase/storage';
import { useAuth } from '@/lib/hooks/useAuth';
import { PrimaryButton } from '@/components/ui/Button';
import BrandLogo from '@/components/shared/BrandLogo';
import LegalAgreementForm from '@/components/legal/LegalAgreementForm';

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [mpesaTill, setMpesaTill] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [error, setError] = useState('');

  const uploadDoc = async (file: File) => {
    if (!user) return;
    try {
      const url = await uploadMerchantDoc(user.id, file);
      setDocumentUrl(url);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to upload business document.');
    }
  };

  const saveProfileDraft = async () => {
    if (!user) throw new Error('No active user session.');
    const { error: err } = await supabase
      .from('profiles')
      .update({
        business_name: businessName,
        phone_number: phone,
        mpesa_till: mpesaTill,
        store_description: storeDescription,
        documents: { registration: documentUrl },
      })
      .eq('id', user.id);
    if (err) throw err;
  };

  const finishOnboarding = async () => {
    if (!user) return;
    const { error: err } = await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id);
    if (err) throw err;
    router.push('/merchant/overview');
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-5xl card-surface p-8">
        <BrandLogo className="mb-6" markClassName="h-14 w-14" textClassName="text-2xl font-black italic text-white" priority />
        <h1 className="text-3xl font-bold">Merchant Setup</h1>
        <p className="text-muted mt-2">Step {step} of 5</p>

        {step === 1 && (
          <div className="mt-6 space-y-4">
            <input className="input-shell" placeholder="Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            <input className="input-shell" placeholder="Business Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted">Upload business registration or verification document.</p>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-5 py-8 text-center">
              <span className="text-sm font-bold text-white">Choose a file</span>
              <span className="mt-2 text-xs text-[#8f98ab]">PDF or clear image, max 10MB.</span>
              <input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => e.target.files && uploadDoc(e.target.files[0])} />
            </label>
            {documentUrl ? <p className="text-xs text-green-400">Business document uploaded.</p> : null}
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            <input className="input-shell" placeholder="M-Pesa Till / Pochi Number" value={mpesaTill} onChange={(e) => setMpesaTill(e.target.value)} />
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 space-y-4">
            <textarea className="input-shell min-h-[180px]" placeholder="Store Description" rows={4} value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} />
          </div>
        )}

        {step === 5 && (
          <div className="mt-6">
            <LegalAgreementForm
              agreementType="merchant"
              mode="onboarding"
              submitLabel="Submit Agreement and Finish"
              beforeSubmit={saveProfileDraft}
              afterSubmit={finishOnboarding}
            />
          </div>
        )}

        {error ? <p className="text-xs text-red-400 mt-4">{error}</p> : null}

        {step < 5 ? (
          <div className="mt-6 flex justify-between">
            <button className="border border-white/20 rounded-full px-4 py-2 text-xs" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>Back</button>
            <PrimaryButton onClick={() => setStep((s) => s + 1)}>Next</PrimaryButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
