'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { openDocumentViewer } from '@/lib/documents/openDocument';

const actionMeta = {
  approve: { label: 'Approve', className: 'bg-[#009A44] text-white' },
  request_revision: { label: 'Request Revision', className: 'bg-orange-500 text-white' },
  reject: { label: 'Reject', className: 'bg-[#BB0000] text-white' },
} as const;

export default function Page() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const data = await adminApi.contractReviewQueue();
      setItems(data.items || []);
      setSelectedId((current) => current && (data.items || []).some((item: any) => item.id === current) ? current : data.items?.[0]?.id || null);
    } catch (error: any) {
      setStatus(error.message || 'Failed to load contract review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);

  const review = async (action: 'approve' | 'reject' | 'request_revision') => {
    if (!selected) return;
    setBusyAction(action);
    setStatus(null);
    try {
      await adminApi.reviewContract(selected.id, {
        action,
        review_notes: reviewNotes || undefined,
        rejection_reason: action === 'approve' ? undefined : rejectionReason,
      });
      setReviewNotes('');
      setRejectionReason('');
      setStatus(`Agreement ${actionMeta[action].label.toLowerCase()}d.`);
      await load();
    } catch (error: any) {
      setStatus(error.message || 'Failed to review contract.');
    } finally {
      setBusyAction(null);
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black italic">Contracts</h1>
        <p className="mt-2 text-sm text-muted">Review legal agreement submissions before fully activating compliant merchant and affiliate operations.</p>
      </div>

      {status ? <div className="card-surface p-4 text-sm text-[#d8deea]">{status}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="card-surface p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Review Queue</h2>
            <button className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white" onClick={load}>Refresh</button>
          </div>
          {loading ? <div className="text-sm text-muted">Loading queue...</div> : null}
          <div className="space-y-3">
            {items.map((item) => {
              const name = item.profile?.business_name || item.profile?.full_name || item.user_id;
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active ? 'border-[#009A44] bg-[#009A44]/8' : 'border-white/8 bg-black/20 hover:bg-white/[0.03]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">{name}</div>
                      <div className="mt-1 text-xs text-[#8f98ab]">{item.agreement_number}</div>
                    </div>
                    <span className="rounded-full bg-yellow-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-yellow-200">{item.agreement_type}</span>
                  </div>
                  <div className="mt-3 grid gap-1 text-xs text-[#8f98ab]">
                    <div>Method: {item.acceptance_method?.replace('_', ' ')}</div>
                    <div>Submitted: {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : '—'}</div>
                    <div>Status: {item.status}</div>
                  </div>
                </button>
              );
            })}
            {!loading && items.length === 0 ? <div className="rounded-2xl border border-white/8 bg-black/20 p-5 text-sm text-muted">No legal agreements are waiting for review.</div> : null}
          </div>
        </div>

        <div className="card-surface p-6">
          {!selected ? (
            <div className="text-sm text-muted">Select an agreement to review.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">Agreement</div>
                  <h2 className="mt-2 text-2xl font-black italic text-white">{selected.agreement_number}</h2>
                  <p className="mt-2 text-sm text-[#d8deea]">{selected.profile?.business_name || selected.profile?.full_name}</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">{selected.agreement_type}</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">User Details</div>
                  <div className="mt-3 grid gap-2 text-sm text-[#d8deea]">
                    <div>Name: {selected.profile?.business_name || selected.profile?.full_name || '—'}</div>
                    <div>Role: {selected.profile?.role || selected.agreement_type}</div>
                    <div>Phone: {selected.profile?.phone_number || selected.profile?.payout_phone || '—'}</div>
                    {selected.profile?.mpesa_till ? <div>M-Pesa Till: {selected.profile.mpesa_till}</div> : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">Acceptance Details</div>
                  <div className="mt-3 grid gap-2 text-sm text-[#d8deea]">
                    <div>Method: {selected.acceptance_method?.replace('_', ' ')}</div>
                    <div>Signed by: {selected.signature_full_name || '—'}</div>
                    <div>Submitted: {selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : '—'}</div>
                    <div>IP: {selected.digital_signature_ip || '—'}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">Acknowledgements</div>
                <div className="mt-3 grid gap-2 text-sm text-[#d8deea] md:grid-cols-2">
                  <div>{selected.accepted_terms ? 'Accepted' : 'Missing'}: Agreement terms</div>
                  <div>{selected.accepted_fees ? 'Accepted' : 'Missing'}: Fees and payout terms</div>
                  <div>{selected.accepted_privacy ? 'Accepted' : 'Missing'}: Accuracy and privacy statement</div>
                  <div>{selected.accepted_dispute ? 'Accepted' : 'Missing'}: Dispute resolution terms</div>
                </div>
              </div>

              {selected.digital_signature ? (
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">Digital Signature</div>
                  <button type="button" onClick={() => openDocumentViewer({ url: selected.digital_signature, name: 'digital-signature.png' })} className="mt-4 block w-full rounded-2xl border border-white/8 bg-[#0A0E17] p-3 text-left"><img src={selected.digital_signature} alt="Digital signature" className="h-36 w-full object-contain" /></button>
                </div>
              ) : null}

              {selected.signed_contract_storage_path ? (
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">Uploaded Contract</div>
                      <div className="mt-2 text-sm text-[#d8deea]">{selected.signed_contract_filename || 'Signed contract copy'}</div>
                    </div>
                    <button className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white" onClick={() => openDocumentViewer({ bucket: 'legal-agreements', path: selected.signed_contract_storage_path, name: selected.signed_contract_filename || 'signed-agreement.pdf' })}>Open File</button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4">
                <textarea className="input-shell min-h-[120px]" placeholder="Internal review notes" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} />
                <textarea className="input-shell min-h-[120px]" placeholder="Reason shown to the user if you reject or request revision" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
              </div>

              <div className="flex flex-wrap gap-3">
                {(Object.keys(actionMeta) as Array<keyof typeof actionMeta>).map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => review(action)}
                    disabled={busyAction !== null}
                    className={`rounded-full px-5 py-3 text-sm font-bold transition disabled:opacity-60 ${actionMeta[action].className}`}
                  >
                    {busyAction === action ? `${actionMeta[action].label}...` : actionMeta[action].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
