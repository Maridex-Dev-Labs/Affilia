'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Camera } from '@phosphor-icons/react';
import { useProfile } from '@/lib/hooks/useProfile';
import Button from '@/components/ui/Button';
import { uploadMerchantDoc, uploadProfileAvatar } from '@/lib/supabase/storage';
import LegalAgreementForm from '@/components/legal/LegalAgreementForm';
import AccountDeletionCard from '@/components/settings/AccountDeletionCard';
import DownloadDataCard from '@/components/settings/DownloadDataCard';
import PlanSelectionCard from '@/components/settings/PlanSelectionCard';
import { sanitizeUserFacingError } from '@/lib/errors';
import { usersApi } from '@/lib/api/users';
import { formatAccountDate, getAccountControl } from '@/lib/account/status';

type MerchantVerificationDocs = {
  business_document_path?: string;
  status?: string;
  notes?: string;
};

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
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [till, setTill] = useState('');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [verificationStatusText, setVerificationStatusText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [businessDocumentPath, setBusinessDocumentPath] = useState<string | null>(null);
  const [uploadingBusinessDoc, setUploadingBusinessDoc] = useState(false);

  const verificationDocs = useMemo(() => {
    const documents = (profile?.documents || {}) as Record<string, any>;
    return (documents.merchant_verification || {}) as MerchantVerificationDocs;
  }, [profile]);
  const accountControl = useMemo(() => getAccountControl(profile?.documents), [profile?.documents]);

  const merchantVerificationStatus = useMemo(() => {
    if (profile?.business_verified) return 'verified';
    return verificationDocs.status || 'not_started';
  }, [profile?.business_verified, verificationDocs.status]);

  useEffect(() => {
    if (!profile) return;
    setBusinessName(profile.business_name || '');
    setPhone(profile.phone_number || '');
    setTill(profile.mpesa_till || '');
    setPayoutPhone(profile.payout_phone || '');
    setDescription(profile.store_description || '');
    setAvatarUrl(profile.avatar_url || null);
    setBusinessDocumentPath(typeof verificationDocs.business_document_path === 'string' ? verificationDocs.business_document_path : typeof (profile.documents as any)?.registration === 'string' ? (profile.documents as any).registration : null);
  }, [profile, verificationDocs.business_document_path]);

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!profile || !event.target.files?.[0]) return;
    try {
      const file = event.target.files[0];
      const url = await uploadProfileAvatar(profile.id, file);
      setAvatarUrl(url);
      setSaveStatus('Avatar uploaded. Save changes to keep it on your profile.');
    } catch (error: unknown) {
      setSaveStatus(formatProfileError(error, 'We could not upload that avatar right now.'));
    }
  };

  const uploadBusinessDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!profile || !event.target.files?.[0]) return;
    const file = event.target.files[0];
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setVerificationStatusText('Upload a PDF, JPG, PNG, or WEBP business document.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setVerificationStatusText('Business documents must be 10MB or smaller.');
      return;
    }

    setUploadingBusinessDoc(true);
    setVerificationStatusText(null);
    try {
      const path = await uploadMerchantDoc(profile.id, file);
      setBusinessDocumentPath(path);
      setVerificationStatusText('Business document uploaded.');
    } catch (error: unknown) {
      setVerificationStatusText(formatProfileError(error, 'Your business document could not be uploaded. Try again.'));
    } finally {
      setUploadingBusinessDoc(false);
    }
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      await usersApi.updateProfile({
        business_name: businessName,
        phone_number: phone,
        mpesa_till: till,
        payout_phone: payoutPhone,
        store_description: description,
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
      if (!businessName.trim()) throw new Error('Save your business name before submitting verification.');
      if (!phone.trim()) throw new Error('Save your primary phone number before submitting verification.');
      if (!businessDocumentPath) throw new Error('Upload your business document before submitting verification.');

      await usersApi.updateProfile({
        business_name: businessName,
        phone_number: phone,
        mpesa_till: till,
        payout_phone: payoutPhone,
        store_description: description,
        avatar_url: avatarUrl,
      });
      await usersApi.submitMerchantVerification({ business_document_path: businessDocumentPath });
      setVerificationStatusText('Business verification submitted. Your merchant tools stay active while the system reviews your documents.');
    } catch (error: unknown) {
      setVerificationStatusText(formatProfileError(error, 'We could not submit business verification right now.'));
    } finally {
      setSubmittingVerification(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black italic">Merchant Settings</h1>
        <p className="text-muted mt-2">Manage your business identity, payout details, storefront profile, verification package, and legal agreement status.</p>
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
          {saveStatus ? <p className="text-sm text-[#9ed4b2]">{saveStatus}</p> : null}
          <Button loading={saving} loadingText="Saving settings..." onClick={save}>Save Changes</Button>
        </div>
      </div>
      <div className="card-surface p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Merchant Verification</h2>
            <p className="mt-2 text-sm text-[#8f98ab]">
              Upload your business registration or ownership proof in a readable format. The system uses these files to confirm your store identity and keep marketplace operations trustworthy.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/75">
            {merchantVerificationStatus.replace(/_/g, ' ')}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#d4dbe7]">
          {merchantVerificationStatus === 'verified'
            ? 'Your merchant business identity is verified. Product listings and billing approvals continue to activate through the normal system workflow.'
            : merchantVerificationStatus === 'submitted' || merchantVerificationStatus === 'under_review'
              ? 'Your business verification is under review. Keep your phone, payout, and agreement details current while the system checks your documents.'
              : merchantVerificationStatus === 'revision_requested'
                ? 'Your business verification needs revision. Upload a clearer or more current business document, then submit again.'
                : 'Upload your business registration or ownership document after saving your business and phone details.'}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <label className="rounded-2xl border border-dashed border-white/10 bg-[#121824] p-4 text-sm text-[#cfd5e1]">
            <div className="font-semibold text-white">Business document</div>
            <div className="mt-1 text-xs text-[#8f98ab]">Accepted: PDF, JPG, PNG, WEBP up to 10MB.</div>
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-3 block text-xs" onChange={uploadBusinessDocument} />
            <div className="mt-2 text-xs text-[#9ed4b2]">{uploadingBusinessDoc ? 'Uploading...' : businessDocumentPath ? 'Document uploaded' : 'Not uploaded yet'}</div>
          </label>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#cfd5e1]">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Review checklist</div>
            <ul className="mt-3 space-y-2">
              <li>• Your business document should clearly show the registered business or owner details.</li>
              <li>• The business name and phone on this form should match the uploaded document where possible.</li>
              <li>• Agreement submission and verification review work independently, so keep both up to date.</li>
            </ul>
          </div>
        </div>
        {verificationStatusText ? <p className="text-sm text-[#9ed4b2]">{verificationStatusText}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button loading={submittingVerification} loadingText="Submitting verification..." onClick={submitVerification} disabled={!profile || merchantVerificationStatus === 'verified'}>
            Submit Business Verification
          </Button>
        </div>
      </div>
      {profile ? <PlanSelectionCard role="merchant" profileId={profile.id} defaultPhone={payoutPhone || phone} /> : null}
      <LegalAgreementForm agreementType="merchant" mode="settings" submitLabel="Submit Updated Agreement" />
      <DownloadDataCard />
      <AccountDeletionCard />
    </div>
  );
}
