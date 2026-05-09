'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Camera } from '@phosphor-icons/react';
import { affiliateApi } from '@/lib/api/affiliate';
import { usePlanAccess } from '@/lib/hooks/usePlanAccess';
import { useProfile } from '@/lib/hooks/useProfile';
import Button from '@/components/ui/Button';
import { uploadProfileAvatar, uploadVerificationDocument } from '@/lib/supabase/storage';
import LegalAgreementForm from '@/components/legal/LegalAgreementForm';
import AccountDeletionCard from '@/components/settings/AccountDeletionCard';
import DownloadDataCard from '@/components/settings/DownloadDataCard';
import PlanSelectionCard from '@/components/settings/PlanSelectionCard';
import { sanitizeUserFacingError } from '@/lib/errors';
import { usersApi } from '@/lib/api/users';
import { getAccountControl, formatAccountDate } from '@/lib/account/status';

type VerificationDocs = {
  national_id_last4?: string;
  id_front_path?: string;
  id_back_path?: string;
  status?: string;
  notes?: string;
};

function maskStoredId(value?: string | null) {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (raw.includes('*')) return raw;
  const normalized = raw.replace(/\s+/g, '');
  if (normalized.length <= 4) return normalized;
  return `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
}

function formatProfileError(error: unknown, fallback: string) {
  const anyError = error as { code?: string; message?: string; details?: string };
  if (anyError?.code === '23505') {
    const raw = `${anyError.message || ''} ${anyError.details || ''}`.toLowerCase();
    if (raw.includes('phone_number')) return 'That phone number is already in use on another account.';
    if (raw.includes('payout_phone')) return 'That payout phone is already in use on another account.';
  }
  return sanitizeUserFacingError(error, fallback);
}

export default function Page() {
  const { profile } = useProfile();
  const { affiliateVerificationStatus, activePlanCode } = usePlanAccess();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [niches, setNiches] = useState('');
  const [channels, setChannels] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [verificationStatusText, setVerificationStatusText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [nationalIdInput, setNationalIdInput] = useState('');
  const [idFrontPath, setIdFrontPath] = useState<string | null>(null);
  const [idBackPath, setIdBackPath] = useState<string | null>(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  const verificationDocs = useMemo(() => {
    const documents = (profile?.documents || {}) as Record<string, any>;
    return (documents.affiliate_verification || {}) as VerificationDocs;
  }, [profile]);
  const accountControl = useMemo(() => getAccountControl(profile?.documents), [profile?.documents]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || '');
    setPhone(profile.phone_number || '');
    setPayoutPhone(profile.payout_phone || '');
    setNiches(Array.isArray(profile.niches) ? profile.niches.join(', ') : '');
    setChannels(Array.isArray(profile.promotion_channels) ? profile.promotion_channels.join(', ') : '');
    setAvatarUrl(profile.avatar_url || null);
    setNationalIdInput('');
    setIdFrontPath(typeof verificationDocs.id_front_path === 'string' ? verificationDocs.id_front_path : null);
    setIdBackPath(typeof verificationDocs.id_back_path === 'string' ? verificationDocs.id_back_path : null);
  }, [profile, verificationDocs.id_back_path, verificationDocs.id_front_path]);

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!profile || !event.target.files?.[0]) return;
    try {
      const url = await uploadProfileAvatar(profile.id, event.target.files[0]);
      setAvatarUrl(url);
      setSaveStatus('Avatar uploaded. Save changes to keep it on your profile.');
    } catch (error: unknown) {
      setSaveStatus(formatProfileError(error, 'We could not upload that avatar right now.'));
    }
  };

  const uploadIdSide = async (event: ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    if (!profile || !event.target.files?.[0]) return;
    const file = event.target.files[0];
    if (!/^image\//.test(file.type)) {
      setVerificationStatusText('Upload a clear image file for your national ID.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setVerificationStatusText('Each ID image must be 5MB or smaller.');
      return;
    }

    side === 'front' ? setUploadingFront(true) : setUploadingBack(true);
    setVerificationStatusText(null);
    try {
      const path = await uploadVerificationDocument(profile.id, file);
      if (side === 'front') setIdFrontPath(path);
      if (side === 'back') setIdBackPath(path);
      setVerificationStatusText(`National ID ${side} image uploaded.`);
    } catch (error: unknown) {
      setVerificationStatusText(formatProfileError(error, 'Your ID image could not be uploaded. Try again.'));
    } finally {
      side === 'front' ? setUploadingFront(false) : setUploadingBack(false);
    }
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      await usersApi.updateProfile({
        full_name: fullName,
        phone_number: phone,
        payout_phone: payoutPhone,
        niches: niches.split(',').map((item) => item.trim()).filter(Boolean),
        promotion_channels: channels.split(',').map((item) => item.trim()).filter(Boolean),
        avatar_url: avatarUrl,
      });
      setSaveStatus('Settings updated successfully.');
    } catch (error: unknown) {
      setSaveStatus(formatProfileError(error, 'We could not save settings right now.'));
    } finally {
      setSaving(false);
    }
  };

  const submitVerification = async () => {
    if (!profile) return;
    setSubmittingVerification(true);
    setVerificationStatusText(null);
    try {
      if (!phone.trim()) throw new Error('Save your primary phone number before submitting verification.');
      if (!payoutPhone.trim()) throw new Error('Save your payout phone number before submitting verification.');
      if (!nationalIdInput.trim()) throw new Error('Enter your national ID number before submitting verification.');
      if (!idFrontPath) throw new Error('Upload the front side of your national ID before submitting.');
      if (!idBackPath) throw new Error('Upload the back side of your national ID before submitting.');

      await usersApi.updateProfile({
        full_name: fullName,
        phone_number: phone,
        payout_phone: payoutPhone,
        niches: niches.split(',').map((item) => item.trim()).filter(Boolean),
        promotion_channels: channels.split(',').map((item) => item.trim()).filter(Boolean),
        avatar_url: avatarUrl,
      });

      await affiliateApi.submitVerification({
        national_id_number: nationalIdInput,
        id_front_path: idFrontPath,
        id_back_path: idBackPath,
      });
      setNationalIdInput('');
      setVerificationStatusText('Verification submitted. You will unlock affiliate operations immediately after system approval.');
    } catch (error: unknown) {
      setVerificationStatusText(formatProfileError(error, 'We could not submit affiliate verification right now.'));
    } finally {
      setSubmittingVerification(false);
    }
  };

  const maskedId = verificationDocs.national_id_last4
    ? `******${verificationDocs.national_id_last4}`
    : maskStoredId(profile?.national_id_number);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black italic">Affiliate Settings</h1>
        <p className="text-muted mt-2">Control your profile, payout destination, promotion profile, and legal agreement status.</p>
      </div>
      {accountControl.status === 'warned' && accountControl.warning_message ? (
        <div className="rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/10 p-4 text-sm text-[#f8d6a4]">
          Account warning: {accountControl.warning_message}
        </div>
      ) : null}
      {accountControl.status === 'scheduled_for_deletion' ? (
        <div className="rounded-2xl border border-[#BB0000]/20 bg-[#BB0000]/10 p-4 text-sm text-[#f5c2c2]">
          Account deletion is scheduled for {formatAccountDate(accountControl.scheduled_for) || 'the end of the grace period'} unless you cancel it.
        </div>
      ) : null}
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
          {saveStatus ? <p className="text-sm text-[#9ed4b2]">{saveStatus}</p> : null}
          <Button loading={saving} loadingText="Saving settings..." onClick={save}>Save Changes</Button>
        </div>
      </div>
      <div className="card-surface p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Affiliate Verification</h2>
            <p className="mt-2 text-sm text-[#8f98ab]">
              Submit your hashed national ID and clear front/back ID images. Only verified affiliates with an active package can generate links, access payouts, and unlock the full operating workspace.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/75">
            {affiliateVerificationStatus.replace(/_/g, ' ')}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#d4dbe7]">
          {affiliateVerificationStatus === 'verified'
            ? 'Your affiliate identity is verified. Package entitlements and payouts update immediately after system approval.'
            : affiliateVerificationStatus === 'submitted' || affiliateVerificationStatus === 'under_review'
              ? 'Your verification is under review. The system is checking identity quality, duplicate risk, and payout readiness.'
              : affiliateVerificationStatus === 'restricted_duplicate'
                ? 'This account is flagged for duplicate-risk review. Update your identity package if requested and wait for system review.'
                : affiliateVerificationStatus === 'revision_requested'
                  ? 'Your identity package needs revision. Upload clearer ID images or correct the requested details, then submit again.'
                  : 'Upload both sides of your national ID and make sure your phone and payout details are saved before submitting.'}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Identity</div>
            <input
              className="input-shell"
              placeholder={maskedId ? `Masked ID on file: ${maskedId}` : 'National ID number'}
              value={nationalIdInput}
              onChange={(e) => setNationalIdInput(e.target.value.replace(/\s+/g, ''))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-2xl border border-dashed border-white/10 bg-[#121824] p-4 text-sm text-[#cfd5e1]">
                <div className="font-semibold text-white">ID front image</div>
                <div className="mt-1 text-xs text-[#8f98ab]">Clear, readable, and not cropped.</div>
                <input type="file" accept="image/*" className="mt-3 block text-xs" onChange={(event) => uploadIdSide(event, 'front')} />
                <div className="mt-2 text-xs text-[#9ed4b2]">{uploadingFront ? 'Uploading...' : idFrontPath ? 'Front image uploaded' : 'Not uploaded yet'}</div>
              </label>
              <label className="rounded-2xl border border-dashed border-white/10 bg-[#121824] p-4 text-sm text-[#cfd5e1]">
                <div className="font-semibold text-white">ID back image</div>
                <div className="mt-1 text-xs text-[#8f98ab]">Upload the reverse side as a separate image.</div>
                <input type="file" accept="image/*" className="mt-3 block text-xs" onChange={(event) => uploadIdSide(event, 'back')} />
                <div className="mt-2 text-xs text-[#9ed4b2]">{uploadingBack ? 'Uploading...' : idBackPath ? 'Back image uploaded' : 'Not uploaded yet'}</div>
              </label>
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Review checklist</div>
            <ul className="space-y-2 text-sm text-[#cfd5e1]">
              <li>• Your national ID number is stored as a hash and only the masked tail is shown later.</li>
              <li>• Both ID images must be readable and match your payout details.</li>
              <li>• Duplicate phone, payout phone, or identity matches will be held for system review.</li>
            </ul>
            <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3 text-xs text-[#8f98ab]">
              Masked ID on file: {maskedId || 'No masked ID stored yet'}
            </div>
          </div>
        </div>
        {verificationStatusText ? <p className="text-sm text-[#9ed4b2]">{verificationStatusText}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button
            loading={submittingVerification}
            loadingText="Submitting verification..."
            onClick={submitVerification}
            disabled={!profile || affiliateVerificationStatus === 'verified'}
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
      <DownloadDataCard />
      <AccountDeletionCard />
    </div>
  );
}
