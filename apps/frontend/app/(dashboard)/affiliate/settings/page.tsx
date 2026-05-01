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

export default function Page() {
  const { profile } = useProfile();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [niches, setNiches] = useState('');
  const [channels, setChannels] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || '');
    setPhone(profile.phone_number || '');
    setPayoutPhone(profile.payout_phone || '');
    setNiches(Array.isArray(profile.niches) ? profile.niches.join(', ') : '');
    setChannels(Array.isArray(profile.promotion_channels) ? profile.promotion_channels.join(', ') : '');
    setAvatarUrl(profile.avatar_url || null);
  }, [profile]);

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!profile || !event.target.files?.[0]) return;
    const url = await uploadProfileAvatar(profile.id, event.target.files[0]);
    setAvatarUrl(url);
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setStatus(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone_number: phone,
        payout_phone: payoutPhone,
        niches: niches.split(',').map((item) => item.trim()).filter(Boolean),
        promotion_channels: channels.split(',').map((item) => item.trim()).filter(Boolean),
        avatar_url: avatarUrl,
      })
      .eq('id', profile.id);
    setStatus(error ? error.message : 'Settings updated successfully.');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black italic">Affiliate Settings</h1>
        <p className="text-muted mt-2">Control your profile, payout destination, promotion profile, and legal agreement status.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="card-surface p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Affiliate avatar" className="h-28 w-28 rounded-full object-cover border border-white/10" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-black/30 text-3xl font-black">{fullName?.[0] || 'A'}</div>
              )}
              <label className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[#141A2B]">
                <Camera size={18} />
                <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
              </label>
            </div>
            <div className="mt-4 text-lg font-bold">{fullName || 'Affiliate profile'}</div>
            <div className="text-sm text-[#8f98ab]">Use a recognizable face or brand icon for trust in chats and forum posts.</div>
          </div>
        </div>
        <div className="card-surface p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="input-shell" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <input className="input-shell" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="input-shell sm:col-span-2" placeholder="Payout phone" value={payoutPhone} onChange={(e) => setPayoutPhone(e.target.value)} />
          </div>
          <input className="input-shell" placeholder="Niches e.g. Fashion, Tech, Home" value={niches} onChange={(e) => setNiches(e.target.value)} />
          <input className="input-shell" placeholder="Promotion channels e.g. WhatsApp, TikTok, Instagram" value={channels} onChange={(e) => setChannels(e.target.value)} />
          {status ? <p className="text-sm text-[#9ed4b2]">{status}</p> : null}
          <Button loading={saving} loadingText="Saving settings..." onClick={save}>Save Changes</Button>
        </div>
      </div>
      {profile ? <PlanSelectionCard role="affiliate" profileId={profile.id} defaultPhone={payoutPhone || phone} /> : null}
      <LegalAgreementForm agreementType="affiliate" mode="settings" submitLabel="Submit Updated Agreement" />
      <AccountDeletionCard />
    </div>
  );
}
