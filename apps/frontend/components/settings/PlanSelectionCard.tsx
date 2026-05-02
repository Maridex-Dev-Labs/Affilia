'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Copy, CreditCard, Wallet } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import { affiliatePlans, formatKes, merchantPlans, paymentChannels, type PlanRole } from '@/lib/config/pricing';
import { sanitizeUserFacingError } from '@/lib/errors';

type PlanSelectionRecord = {
  profile_id: string;
  role: PlanRole;
  plan_code: string;
  plan_name: string;
  amount_kes: number;
  billing_cycle: 'monthly';
  payment_channel: 'mpesa_p2p' | 'free_activation';
  payment_destination: string | null;
  payment_reference: string;
  payer_phone: string | null;
  mpesa_reference: string | null;
  status: 'pending_payment' | 'pending_verification' | 'active' | 'expired' | 'cancelled';
  expires_at: string | null;
};

type Props = {
  role: PlanRole;
  profileId: string;
  defaultPhone?: string | null;
};

const paymentChannel = paymentChannels[0];

function buildReference(role: PlanRole) {
  const stamp = Date.now().toString().slice(-6);
  return `AFF-${role === 'merchant' ? 'MER' : 'AFL'}-${stamp}`;
}

function getStatusTone(status: PlanSelectionRecord['status']) {
  switch (status) {
    case 'active':
      return 'bg-[#009A44]/15 text-[#9ed4b2] border-[#009A44]/25';
    case 'pending_verification':
      return 'bg-[#BB0000]/12 text-[#ffce9d] border-[#f59e0b]/25';
    case 'pending_payment':
      return 'bg-white/6 text-white/80 border-white/10';
    default:
      return 'bg-white/6 text-white/65 border-white/10';
  }
}

export default function PlanSelectionCard({ role, profileId, defaultPhone }: Props) {
  const plans = role === 'merchant' ? merchantPlans : affiliatePlans;
  const featuredPlan = plans.find((plan) => plan.featured) || plans[0];

  const [record, setRecord] = useState<PlanSelectionRecord | null>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState(featuredPlan.code);
  const [payerPhone, setPayerPhone] = useState(defaultPhone || '');
  const [mpesaReference, setMpesaReference] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const selectedPlan = useMemo(() => plans.find((plan) => plan.code === selectedPlanCode) || plans[0], [plans, selectedPlanCode]);

  const loadRecord = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profile_plan_selections')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      setStatus(sanitizeUserFacingError(error, 'Package information is temporarily unavailable.'));
      setLoading(false);
      return;
    }

    setRecord((data as PlanSelectionRecord | null) || null);
    if (data?.plan_code) setSelectedPlanCode(data.plan_code);
    if (data?.payer_phone) setPayerPhone(data.payer_phone);
    if (data?.mpesa_reference) setMpesaReference(data.mpesa_reference);
    setLoading(false);
  };

  useEffect(() => {
    void loadRecord();
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    const channel = supabase
      .channel(`plan-selection:${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_plan_selections', filter: `profile_id=eq.${profileId}` }, loadRecord)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` }, loadRecord)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profileId]);

  useEffect(() => {
    if (defaultPhone && !payerPhone) setPayerPhone(defaultPhone);
  }, [defaultPhone, payerPhone]);

  const reservePlan = async () => {
    setSaving(true);
    setStatus(null);

    const isFree = selectedPlan.priceKes === 0;
    const paymentReference = record?.payment_reference || buildReference(role);
    const now = new Date();
    const expiresAt = isFree ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      profile_id: profileId,
      role,
      plan_code: selectedPlan.code,
      plan_name: selectedPlan.name,
      amount_kes: selectedPlan.priceKes,
      billing_cycle: selectedPlan.billingCycle,
      payment_channel: isFree ? 'free_activation' : 'mpesa_p2p',
      payment_destination: isFree ? null : paymentChannel.destination,
      payment_reference: paymentReference,
      payer_phone: payerPhone || null,
      mpesa_reference: isFree ? 'FREE-ACTIVATION' : null,
      status: isFree ? 'active' : 'pending_payment',
      paid_at: isFree ? now.toISOString() : null,
      activated_at: isFree ? now.toISOString() : null,
      expires_at: expiresAt,
      metadata: {
        highlights: selectedPlan.highlights,
        cadenceLabel: selectedPlan.cadenceLabel,
      },
    };

    const { error } = await supabase.from('profile_plan_selections').upsert(payload, { onConflict: 'profile_id' });
    if (error) {
      setStatus(sanitizeUserFacingError(error, 'We could not reserve the package right now.'));
      setSaving(false);
      return;
    }

    setStatus(
      isFree
        ? `${selectedPlan.name} is now active.`
        : `${selectedPlan.name} reserved. Send ${formatKes(selectedPlan.priceKes)} to ${paymentChannel.destination} and then submit the M-Pesa code below.`,
    );
    await loadRecord();
    setSaving(false);
  };

  const submitPayment = async () => {
    if (!record && selectedPlan.priceKes > 0) {
      setStatus('Reserve the package first so we can generate your payment reference.');
      return;
    }
    if (!mpesaReference.trim()) {
      setStatus('Enter the M-Pesa confirmation code after you pay.');
      return;
    }

    setSubmittingPayment(true);
    setStatus(null);
    const { error } = await supabase
      .from('profile_plan_selections')
      .update({
        payer_phone: payerPhone || null,
        mpesa_reference: mpesaReference.trim().toUpperCase(),
        status: 'pending_verification',
        paid_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId);

    if (error) {
      setStatus(sanitizeUserFacingError(error, 'We could not submit the payment confirmation right now.'));
      setSubmittingPayment(false);
      return;
    }

    setStatus('Payment confirmation submitted. Affilia will verify the package and activate it after review.');
    await loadRecord();
    setSubmittingPayment(false);
  };

  return (
    <div className="card-surface space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-black italic text-white">Packages & Billing</h2>
          <p className="mt-2 text-sm text-[#8f98ab]">
            Pick your {role} package inside settings, pay through the P2P channel, and keep the upgrade trail attached to your account.
          </p>
        </div>
        {record ? (
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${getStatusTone(record.status)}`}>
            <CheckCircle size={16} weight="fill" />
            {record.status.replace(/_/g, ' ')}
          </div>
        ) : null}
      </div>

      {record ? (
        <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">Current Package</div>
              <div className="mt-2 text-xl font-black italic text-white">{record.plan_name}</div>
              <div className="mt-1 text-sm text-[#9aa2b5]">
                {formatKes(Number(record.amount_kes || 0))} / month · Ref {record.payment_reference}
              </div>
            </div>
            <div className="text-sm text-[#9aa2b5]">
              {record.status === 'active'
                ? 'This package is already active on your account.'
                : record.status === 'pending_verification'
                  ? 'Your payment is waiting for verification.'
                  : 'Your package is reserved and awaiting payment confirmation.'}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {plans.map((plan) => {
          const active = selectedPlanCode === plan.code;
          const current = record?.plan_code === plan.code;
          const accent = role === 'merchant' ? 'border-[#BB0000]/35' : 'border-[#009A44]/35';
          const tone = plan.featured
            ? role === 'merchant'
              ? 'from-[#BB0000]/12 to-black/35'
              : 'from-[#009A44]/12 to-black/35'
            : 'from-white/[0.04] to-black/35';
          return (
            <button
              key={plan.code}
              type="button"
              onClick={() => setSelectedPlanCode(plan.code)}
              className={`rounded-[1.5rem] border p-5 text-left transition ${active ? `${accent} bg-[linear-gradient(180deg,${role === 'merchant' ? 'rgba(187,0,0,0.06)' : 'rgba(0,154,68,0.06)'},rgba(0,0,0,0.35))]` : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.35))] hover:border-white/20'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black italic text-white">{plan.name}</div>
                  <div className="mt-2">
                    <span className={`text-3xl font-black ${plan.featured ? (role === 'merchant' ? 'text-[#ff8d8d]' : 'text-[#9ed4b2]') : 'text-white'}`}>{formatKes(plan.priceKes)}</span>
                    <span className="ml-1 text-sm text-[#8f98ab]">{plan.cadenceLabel}</span>
                  </div>
                </div>
                {current ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">Current</span> : null}
              </div>
              <p className="mt-4 text-sm text-[#9ca5b9]">{plan.description}</p>
              <div className="mt-4 space-y-2 text-sm text-white/80">
                {plan.highlights.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle size={14} color={role === 'merchant' ? '#BB0000' : '#009A44'} weight="fill" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">Loading package information...</div>
      ) : selectedPlan.priceKes > 0 ? (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                <Wallet size={22} color={role === 'merchant' ? '#BB0000' : '#009A44'} weight="duotone" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Payment Channel</div>
                <div className="text-sm text-[#8f98ab]">{paymentChannel.name}</div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-[#0A0E17] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">P2P Number</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-3xl font-black italic text-white">{paymentChannel.destination}</div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(paymentChannel.destination)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/75 hover:bg-white/10"
                >
                  <Copy size={14} /> Copy
                </button>
              </div>
              <p className="mt-3 text-sm text-[#8f98ab]">{paymentChannel.helpText}</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                <CreditCard size={22} color={role === 'merchant' ? '#BB0000' : '#009A44'} weight="duotone" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Selected Package</div>
                <div className="text-sm text-[#8f98ab]">{selectedPlan.name} · {formatKes(selectedPlan.priceKes)}</div>
              </div>
            </div>
            <input className="input-shell" placeholder="Payer phone used on M-Pesa" value={payerPhone} onChange={(event) => setPayerPhone(event.target.value)} />
            <input className="input-shell" placeholder="M-Pesa confirmation code after payment" value={mpesaReference} onChange={(event) => setMpesaReference(event.target.value.toUpperCase())} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1 justify-center" loading={saving} loadingText="Saving package..." onClick={reservePlan}>
                Reserve Package
              </Button>
              <Button variant="secondary" className="flex-1 justify-center" loading={submittingPayment} loadingText="Submitting..." onClick={submitPayment}>
                Submit Payment
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-[#009A44]/18 bg-[#009A44]/8 p-5 text-sm text-[#bde7c9]">
          <div className="text-lg font-black italic text-white">{selectedPlan.name}</div>
          <p className="mt-2">This is the free package. No P2P payment is required. Click below to activate it immediately on your account.</p>
          <div className="mt-4">
            <Button loading={saving} loadingText="Activating..." onClick={reservePlan}>Activate Free Package</Button>
          </div>
        </div>
      )}

      {status ? <p className="text-sm text-[#9ed4b2]">{status}</p> : null}
    </div>
  );
}
