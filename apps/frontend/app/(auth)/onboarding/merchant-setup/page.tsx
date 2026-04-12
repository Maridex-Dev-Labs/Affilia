'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { uploadMerchantDoc } from '@/lib/supabase/storage';
import { useAuth } from '@/lib/hooks/useAuth';
import { PrimaryButton } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

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
    } catch (err: any) {
      setError(err.message);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setError('');
    const { error: err } = await supabase.from('profiles').update({
      business_name: businessName,
      phone_number: phone,
      mpesa_till: mpesaTill,
      store_description: storeDescription,
      documents: { registration: documentUrl },
      onboarding_complete: true,
    }).eq('id', user.id);
    if (err) return setError(err.message);
    router.push('/merchant/overview');
  };

  return (
    <div className="min-h-screen bg-kenya-navy text-white flex items-center justify-center px-6">
      <div className="w-full max-w-2xl card-surface p-8">
        <h1 className="text-3xl font-bold">Merchant Setup</h1>
        <p className="text-muted mt-2">Step {step} of 4</p>

        {step === 1 && (
          <div className="mt-6 space-y-4">
            <input
              className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm"
              placeholder="Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
            <input
              className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm"
              placeholder="Business Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted">Upload business registration document.</p>
            <input type="file" onChange={(e) => e.target.files && uploadDoc(e.target.files[0])} />
            {documentUrl && <p className="text-xs text-green-400">Uploaded.</p>}
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            <input
              className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm"
              placeholder="M-Pesa Till / Pochi Number"
              value={mpesaTill}
              onChange={(e) => setMpesaTill(e.target.value)}
            />
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 space-y-4">
            <textarea
              className="w-full rounded-xl bg-black/20 border border-soft px-4 py-3 text-sm"
              placeholder="Store Description"
              rows={4}
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
            />
          </div>
        )}

        {error && <p className="text-xs text-red-400 mt-4">{error}</p>}

        <div className="mt-6 flex justify-between">
          <button
            className="border border-white/20 rounded-full px-4 py-2 text-xs"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            Back
          </button>
          {step < 4 ? (
            <PrimaryButton onClick={() => setStep((s) => s + 1)}>Next</PrimaryButton>
          ) : (
            <PrimaryButton onClick={saveProfile}>Finish Setup</PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
