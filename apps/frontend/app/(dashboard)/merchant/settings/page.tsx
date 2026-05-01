'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { Camera } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/client';
import { useProfile } from '@/lib/hooks/useProfile';
import Button from '@/components/ui/Button';
import { uploadProfileAvatar } from '@/lib/supabase/storage';
import LegalAgreementForm from '@/components/legal/LegalAgreementForm';
import AccountDeletionCard from '@/components/settings/AccountDeletionCard';
import PlanSelectionCard from '@/components/settings/PlanSelectionCard';
import { sanitizeUserFacingError } from '@/lib/errors';

export default function Page() {
  const { profile } = useProfile();
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [till, setTill] = useState('');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setBusinessName(profile.business_name || '');
    setPhone(profile.phone_number || '');
    setTill(profile.mpesa_till || '');
    setPayoutPhone(profile.payout_phone || '');
    setDescription(profile.store_description || '');
    setAvatarUrl(profile.avatar_url || null);
  }, [profile]);

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!profile || !event.target.files?.[0]) return;
    const file = event.target.files[0];
    const url = await uploadProfileAvatar(profile.id, file);
    setAvatarUrl(url);
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setStatus(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        business_name: businessName,
        phone_number: phone,
        mpesa_till: till,
        payout_phone: payoutPhone,
        store_description: description,
        avatar_url: avatarUrl,
      })
      .eq('id', profile.id);
    setStatus(error ? sanitizeUserFacingError(error, 'We could not save settings right now.') : 'Settings updated successfully.');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black italic">Merchant Settings</h1>
        <p className="text-muted mt-2">Manage your business identity, payout details, storefront profile, and legal agreement status.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="card-surface p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Merchant avatar" className="h-28 w-28 rounded-full object-cover border border-white/10" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-black/30 text-3xl font-black">{businessName?.[0] || 'M'}</div>
              )}
              <label className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[#141A2B]">
                <Camera size={18} />
                <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
              </label>
            </div>
            <div className="mt-4 text-lg font-bold">{businessName || 'Merchant profile'}</div>
            <div className="text-sm text-[#8f98ab]">Upload a clean square image for trust and brand recall.</div>
          </div>
        </div>
        <div className="card-surface p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="input-shell" placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            <input className="input-shell" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="input-shell" placeholder="M-Pesa till / store number" value={till} onChange={(e) => setTill(e.target.value)} />
            <input className="input-shell" placeholder="Payout phone" value={payoutPhone} onChange={(e) => setPayoutPhone(e.target.value)} />
          </div>
          <textarea className="input-shell min-h-[160px]" placeholder="Store description" value={description} onChange={(e) => setDescription(e.target.value)} />
          {status ? <p className="text-sm text-[#9ed4b2]">{status}</p> : null}
          <Button loading={saving} loadingText="Saving settings..." onClick={save}>Save Changes</Button>
        </div>
      </div>
      {profile ? <PlanSelectionCard role="merchant" profileId={profile.id} defaultPhone={payoutPhone || phone} /> : null}
      <LegalAgreementForm agreementType="merchant" mode="settings" submitLabel="Submit Updated Agreement" />
      <AccountDeletionCard />
    </div>
  );
}
