'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { Camera } from '@phosphor-icons/react';
import { affiliateApi } from '@/lib/api/affiliate';
import { supabase } from '@/lib/supabase/client';
import { usePlanAccess } from '@/lib/hooks/usePlanAccess';
import { useProfile } from '@/lib/hooks/useProfile';
import Button from '@/components/ui/Button';
import { uploadProfileAvatar } from '@/lib/supabase/storage';
import LegalAgreementForm from '@/components/legal/LegalAgreementForm';
import AccountDeletionCard from '@/components/settings/AccountDeletionCard';
import PlanSelectionCard from '@/components/settings/PlanSelectionCard';
import { sanitizeUserFacingError } from '@/lib/errors';

export default function Page() {
  const { profile } = useProfile();
  const { affiliateVerificationStatus, activePlanCode } = usePlanAccess();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [niches, setNiches] = useState('');
  const [channels, setChannels] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || '');
    setPhone(profile.phone_number || '');
    setPayoutPhone(profile.payout_phone || '');
    setNationalId(profile.national_id_number || '');
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
        national_id_number: nationalId,
        niches: niches.split(',').map((item) => item.trim()).filter(Boolean),
        promotion_channels: channels.split(',').map((item) => item.trim()).filter(Boolean),
        avatar_url: avatarUrl,
      })
      .eq('id', profile.id);
    setStatus(error ? sanitizeUserFacingError(error, 'We could not save settings right now.') : 'Settings updated successfully.');
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
            <input className="input-shell sm:col-span-2" placeholder="National ID number" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
          </div>
          <input className="input-shell" placeholder="Niches e.g. Fashion, Tech, Home" value={niches} onChange={(e) => setNiches(e.target.value)} />
          <input className="input-shell" placeholder="Promotion channels e.g. WhatsApp, TikTok, Instagram" value={channels} onChange={(e) => setChannels(e.target.value)} />
          {status ? <p className="text-sm text-[#9ed4b2]">{status}</p> : null}
          <Button loading={saving} loadingText="Saving settings..." onClick={save}>Save Changes</Button>
        </div>
      </div>
      <div className="card-surface p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Affiliate Verification</h2>
            <p className="mt-2 text-sm text-[#8f98ab]">
              Only verified affiliates with an active package can generate links, record earnings, access payouts, and unlock community-driven monetization.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/75">
            {affiliateVerificationStatus.replace(/_/g, ' ')}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#d4dbe7]">
          {affiliateVerificationStatus === 'verified'
            ? 'Your affiliate identity is verified. Package entitlements and payouts update immediately after billing approval.'
            : affiliateVerificationStatus === 'under_review'
              ? 'Your verification is under review. Duplicate checks and identity approval must clear before operational features unlock.'
              : affiliateVerificationStatus === 'restricted_duplicate'
                ? 'This account is flagged for duplicate-risk review. Admin must clear the restriction before you can operate as an affiliate.'
                : 'Submit your national ID after saving your phone and payout details. Verification prevents duplicate accounts and payout abuse.'}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            loading={submittingVerification}
            loadingText="Submitting verification..."
            onClick={async () => {
              setSubmittingVerification(true);
              setStatus(null);
              try {
                const { error: profileError } = await supabase
                  .from('profiles')
                  .update({
                    full_name: fullName,
                    phone_number: phone,
                    payout_phone: payoutPhone,
                    national_id_number: nationalId,
                    niches: niches.split(',').map((item) => item.trim()).filter(Boolean),
                    promotion_channels: channels.split(',').map((item) => item.trim()).filter(Boolean),
                    avatar_url: avatarUrl,
                  })
                  .eq('id', profile.id);
                if (profileError) {
                  throw profileError;
                }
                await affiliateApi.submitVerification({ national_id_number: nationalId });
                setStatus('Verification submitted. You will unlock affiliate operations immediately after admin approval.');
              } catch (error: unknown) {
                setStatus(sanitizeUserFacingError(error, 'We could not submit affiliate verification right now.'));
              } finally {
                setSubmittingVerification(false);
              }
            }}
            disabled={!profile || !nationalId.trim() || affiliateVerificationStatus === 'verified'}
          >
            Submit Verification
          </Button>
          <div className="rounded-full border border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
            Active package: {activePlanCode || 'none'}
          </div>
        </div>
      </div>
      {profile ? <PlanSelectionCard role="affiliate" profileId={profile.id} defaultPhone={payoutPhone || phone} /> : null}
      <LegalAgreementForm agreementType="affiliate" mode="settings" submitLabel="Submit Updated Agreement" />
      <AccountDeletionCard />
    </div>
  );
}
