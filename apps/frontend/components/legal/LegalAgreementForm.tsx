'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import SignaturePad from '@/components/legal/SignaturePad';
import { contractApi } from '@/lib/api/contracts';
import { uploadSignedAgreement, createSignedStorageUrl } from '@/lib/supabase/storage';
import { useAuth } from '@/lib/hooks/useAuth';
import { contractMeta, type AgreementType } from '@/lib/legal/contracts';
import { sanitizeUserFacingError } from '@/lib/errors';

const badgeStyles: Record<string, string> = {
  pending: 'bg-white/10 text-white',
  under_review: 'bg-yellow-500/15 text-yellow-200',
  submitted: 'bg-yellow-500/15 text-yellow-200',
  active: 'bg-[#009A44]/15 text-[#9af2b8]',
  approved: 'bg-[#009A44]/15 text-[#9af2b8]',
  rejected: 'bg-[#BB0000]/15 text-[#ffb0b0]',
  revision_requested: 'bg-orange-500/15 text-orange-200',
  expired: 'bg-white/10 text-white',
};

type LegalAgreementFormProps = {
  agreementType: AgreementType;
  mode: 'onboarding' | 'settings';
  submitLabel: string;
  beforeSubmit?: () => Promise<void>;
  afterSubmit?: () => Promise<void> | void;
};

export default function LegalAgreementForm({ agreementType, mode, submitLabel, beforeSubmit, afterSubmit }: LegalAgreementFormProps) {
  const { user } = useAuth();
  const meta = contractMeta[agreementType];
  const [current, setCurrent] = useState<any>(null);
  const [contractStatus, setContractStatus] = useState<string | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(mode === 'settings');
  const [acceptanceMethod, setAcceptanceMethod] = useState<'digital_signature' | 'uploaded_pdf'>('digital_signature');
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [signedPath, setSignedPath] = useState<string | null>(null);
  const [signedFilename, setSignedFilename] = useState<string | null>(null);
  const [signedSize, setSignedSize] = useState<number | null>(null);
  const [signedType, setSignedType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checks, setChecks] = useState({ terms: false, fees: false, privacy: false, dispute: false });

  const allChecked = useMemo(() => Object.values(checks).every(Boolean), [checks]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (mode !== 'settings') return;
      setLoadingCurrent(true);
      try {
        const data = await contractApi.current(agreementType);
        if (!mounted) return;
        setCurrent(data.agreement);
        setContractStatus(data.contract_status || data.agreement?.status || null);
      } catch (err: any) {
        if (!mounted) return;
        setError(sanitizeUserFacingError(err, 'We could not load the agreement status right now.'));
      } finally {
        if (mounted) setLoadingCurrent(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [agreementType, mode]);

  const downloadTemplate = async () => {
    setError(null);
    try {
      const blob = await contractApi.downloadTemplate(agreementType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${meta.title.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(sanitizeUserFacingError(err, 'We could not prepare the agreement PDF right now.'));
    }
  };

  const uploadSignedFile = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.[0]) return;
    const file = event.target.files[0];
    setUploading(true);
    setError(null);
    try {
      const path = await uploadSignedAgreement(user.id, file);
      setSignedPath(path);
      setSignedFilename(file.name);
      setSignedSize(file.size);
      setSignedType(file.type || 'application/pdf');
      setStatusMessage('Signed contract uploaded.');
    } catch (err: any) {
      setError(sanitizeUserFacingError(err, 'We could not upload the signed contract right now.'));
    } finally {
      setUploading(false);
    }
  };

  const openUploadedCopy = async () => {
    if (!signedPath) return;
    try {
      const url = await createSignedStorageUrl('legal-agreements', signedPath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(sanitizeUserFacingError(err, 'We could not open the uploaded contract right now.'));
    }
  };

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setStatusMessage(null);
    try {
      await beforeSubmit?.();
      const response = await contractApi.submit({
        agreement_type: agreementType,
        acceptance_method: acceptanceMethod,
        accepted_terms: checks.terms,
        accepted_fees: checks.fees,
        accepted_privacy: checks.privacy,
        accepted_dispute: checks.dispute,
        digital_signature: acceptanceMethod === 'digital_signature' ? signature : null,
        signature_full_name: signatureName || null,
        signed_contract_storage_path: acceptanceMethod === 'uploaded_pdf' ? signedPath : null,
        signed_contract_filename: acceptanceMethod === 'uploaded_pdf' ? signedFilename : null,
        signed_contract_size_bytes: acceptanceMethod === 'uploaded_pdf' ? signedSize : null,
        signed_contract_mime_type: acceptanceMethod === 'uploaded_pdf' ? signedType : null,
      });
      setCurrent(response.agreement);
      setContractStatus(response.agreement?.status || 'under_review');
      setStatusMessage('Agreement submitted. It is now waiting for admin review.');
      await afterSubmit?.();
    } catch (err: any) {
      setError(sanitizeUserFacingError(err, 'We could not submit the agreement right now.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-surface p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-xl font-black italic text-white">{meta.title}</h3>
          <p className="mt-2 max-w-2xl text-sm text-[#aab2c5]">{meta.blurb}</p>
        </div>
        {mode === 'settings' ? (
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${badgeStyles[contractStatus || 'pending'] || badgeStyles.pending}`}>
              {loadingCurrent ? 'Loading…' : (contractStatus || 'pending').replace('_', ' ')}
            </span>
            {current?.agreement_number ? <span className="text-xs text-[#8f98ab]">{current.agreement_number}</span> : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.6rem] border border-white/8 bg-black/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">Preview</div>
              <div className="mt-1 text-sm text-[#d5dbe8]">Read the summary here and download the full PDF before signing.</div>
            </div>
            <Button variant="secondary" size="compact" onClick={downloadTemplate}>Download PDF</Button>
          </div>
          <div className="mt-5 space-y-4">
            {meta.summary.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-[#d5dbe8]">{item}</div>
            ))}
            <div className="grid gap-3 md:grid-cols-2">
              {meta.clauses.map((clause) => (
                <div key={clause.heading} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="font-bold text-white">{clause.heading}</div>
                  <div className="mt-2 text-sm text-[#aab2c5]">{clause.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-white/8 bg-black/20 p-5 space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">Acknowledgement</div>
            <div className="mt-1 text-sm text-[#d5dbe8]">All confirmations are required before the agreement can be submitted.</div>
          </div>
          <div className="space-y-3">
            {meta.acknowledgements.map((item) => (
              <label key={item.key} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[#d5dbe8]">
                <input
                  type="checkbox"
                  checked={checks[item.key]}
                  onChange={(event) => setChecks((currentChecks) => ({ ...currentChecks, [item.key]: event.target.checked }))}
                  className="mt-1"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">Submission Method</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={`rounded-full px-4 py-2 text-xs font-bold ${acceptanceMethod === 'digital_signature' ? 'bg-white text-black' : 'border border-white/12 text-white'}`} onClick={() => setAcceptanceMethod('digital_signature')}>Digital signature</button>
              <button type="button" className={`rounded-full px-4 py-2 text-xs font-bold ${acceptanceMethod === 'uploaded_pdf' ? 'bg-white text-black' : 'border border-white/12 text-white'}`} onClick={() => setAcceptanceMethod('uploaded_pdf')}>Upload signed PDF</button>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">Legal name</label>
              <input className="input-shell" placeholder={agreementType === 'merchant' ? 'Authorized signatory name' : 'Full legal name'} value={signatureName} onChange={(event) => setSignatureName(event.target.value)} />
            </div>

            {acceptanceMethod === 'digital_signature' ? (
              <div className="mt-4"><SignaturePad value={signature} onChange={setSignature} /></div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#0A0E17] px-5 py-7 text-center">
                  <span className="text-sm font-bold text-white">Upload signed contract</span>
                  <span className="mt-2 text-xs text-[#8f98ab]">PDF only, max 10MB. Signed scans are acceptable if readable.</span>
                  <input type="file" accept="application/pdf,image/*" className="hidden" onChange={uploadSignedFile} />
                </label>
                {signedFilename ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[#d5dbe8]">
                    <div>
                      <div className="font-bold text-white">{signedFilename}</div>
                      <div className="text-xs text-[#8f98ab]">{signedSize ? `${(signedSize / 1024 / 1024).toFixed(2)} MB` : 'Uploaded copy ready'}</div>
                    </div>
                    <button type="button" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white" onClick={openUploadedCopy}>Open</button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {mode === 'settings' && current ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-[#d5dbe8]">
              <div className="font-bold text-white">Latest submission</div>
              <div className="mt-2 grid gap-2 text-xs text-[#8f98ab]">
                <div>Status: {current.status}</div>
                <div>Version: {current.version}</div>
                {current.reviewed_at ? <div>Reviewed: {new Date(current.reviewed_at).toLocaleString()}</div> : null}
                {current.expiry_date ? <div>Expires: {current.expiry_date}</div> : null}
                {current.rejection_reason ? <div className="text-[#ffb0b0]">Reason: {current.rejection_reason}</div> : null}
              </div>
            </div>
          ) : null}

          {statusMessage ? <p className="text-sm text-[#9ed4b2]">{statusMessage}</p> : null}
          {error ? <p className="text-sm text-[#ffb0b0]">{error}</p> : null}
          <Button loading={saving || uploading} loadingText={uploading ? 'Uploading signed copy...' : 'Submitting agreement...'} onClick={submit} disabled={!allChecked || !signatureName || (acceptanceMethod === 'digital_signature' ? !signature : !signedPath) || loadingCurrent}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
