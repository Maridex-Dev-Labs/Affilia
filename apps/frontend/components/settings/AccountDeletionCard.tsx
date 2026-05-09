'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button, { SecondaryButton } from '@/components/ui/Button';
import { usersApi } from '@/lib/api/users';
import { sanitizeUserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { formatAccountDate } from '@/lib/account/status';

type DeletionStatus = {
  status: string;
  scheduled_for?: string | null;
  warning_message?: string | null;
  block_reason?: string | null;
  blockers: string[];
  immediate_allowed: boolean;
  grace_days: number;
};

export default function AccountDeletionCard() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'schedule' | 'delete' | 'cancel' | null>(null);
  const [deletion, setDeletion] = useState<DeletionStatus | null>(null);

  const load = async () => {
    try {
      const result = await usersApi.accountDeletionStatus();
      setDeletion(result);
    } catch (error: any) {
      setStatus(sanitizeUserFacingError(error, 'We could not load account deletion options right now.'));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const scheduleDeletion = async () => {
    setBusyAction('schedule');
    setStatus(null);
    try {
      const result = await usersApi.scheduleAccountDeletion(confirmation);
      setDeletion(result);
      setStatus(`Account deletion scheduled. Your account will be removed after ${result.grace_days} days unless you cancel it first.`);
    } catch (error: any) {
      setStatus(sanitizeUserFacingError(error, 'We could not schedule account deletion right now.'));
    } finally {
      setBusyAction(null);
    }
  };

  const deleteImmediately = async () => {
    setBusyAction('delete');
    setStatus(null);
    try {
      await usersApi.deleteAccount(confirmation);
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error: any) {
      setStatus(sanitizeUserFacingError(error, 'We could not process immediate account deletion right now.'));
    } finally {
      setBusyAction(null);
    }
  };

  const cancelDeletion = async () => {
    setBusyAction('cancel');
    setStatus(null);
    try {
      const result = await usersApi.cancelAccountDeletion();
      setDeletion(result);
      setStatus('Scheduled deletion cancelled. Your account remains active.');
    } catch (error: any) {
      setStatus(sanitizeUserFacingError(error, 'We could not cancel scheduled deletion right now.'));
    } finally {
      setBusyAction(null);
    }
  };

  const isScheduled = deletion?.status === 'scheduled_for_deletion';

  return (
    <div className="card-surface border border-[#BB0000]/25 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Account Privacy & Deletion</h3>
          <p className="mt-2 text-sm text-[#aab2c5]">
            You can download your data, schedule deletion with a grace period, or delete immediately if no pending financial or review obligations exist.
          </p>
        </div>
        <span className="rounded-full bg-[#BB0000]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#ffb0b0]">
          Sensitive
        </span>
      </div>

      {deletion?.warning_message ? (
        <div className="mt-5 rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/10 p-4 text-sm text-[#f8d6a4]">
          Warning on account: {deletion.warning_message}
        </div>
      ) : null}

      {deletion?.block_reason ? (
        <div className="mt-5 rounded-2xl border border-[#BB0000]/25 bg-[#BB0000]/10 p-4 text-sm text-[#ffb0b0]">
          Account blocked: {deletion.block_reason}
        </div>
      ) : null}

      {isScheduled ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#d4dbe7]">
          <div className="font-bold text-white">Deletion scheduled</div>
          <div className="mt-2">
            Your account is scheduled for deletion on {formatAccountDate(deletion?.scheduled_for) || 'the end of the grace period'}.
          </div>
        </div>
      ) : null}

      {deletion?.blockers?.length ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-bold text-white">Immediate deletion is unavailable right now</div>
          <ul className="mt-3 space-y-2 text-sm text-[#aab2c5]">
            {deletion.blockers.map((blocker) => (
              <li key={blocker}>• {blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">Type DELETE to confirm</label>
          <input className="input-shell" placeholder="DELETE" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          {status ? <p className="mt-3 text-sm text-[#ffcfb8]">{status}</p> : null}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {isScheduled ? (
            <SecondaryButton loading={busyAction === 'cancel'} onClick={cancelDeletion}>
              Cancel Deletion
            </SecondaryButton>
          ) : (
            <SecondaryButton
              loading={busyAction === 'schedule'}
              onClick={scheduleDeletion}
              disabled={confirmation.trim().toUpperCase() !== 'DELETE'}
            >
              Schedule Deletion
            </SecondaryButton>
          )}
          <Button
            variant="danger"
            loading={busyAction === 'delete'}
            loadingText="Deleting account..."
            disabled={confirmation.trim().toUpperCase() !== 'DELETE' || !deletion?.immediate_allowed}
            onClick={deleteImmediately}
          >
            Delete Immediately
          </Button>
        </div>
      </div>
    </div>
  );
}
