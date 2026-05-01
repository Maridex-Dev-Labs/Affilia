'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { usersApi } from '@/lib/api/users';
import { supabase } from '@/lib/supabase/client';

export default function AccountDeletionCard() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const deleteAccount = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await usersApi.deleteAccount(confirmation);
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error: any) {
      setStatus(error.message || 'Failed to delete account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-surface border border-[#BB0000]/25 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Danger Zone</h3>
          <p className="mt-2 text-sm text-[#aab2c5]">
            Account deletion is blocked while escrow, unsettled commissions, or pending financial operations still exist.
          </p>
        </div>
        <span className="rounded-full bg-[#BB0000]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#ffb0b0]">Irreversible</span>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#8f98ab]">Type DELETE to confirm</label>
          <input
            className="input-shell"
            placeholder="DELETE"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          {status ? <p className="mt-3 text-sm text-[#ffb0b0]">{status}</p> : null}
        </div>
        <div className="flex items-end">
          <Button
            variant="danger"
            loading={busy}
            loadingText="Deleting account..."
            disabled={confirmation.trim().toUpperCase() !== 'DELETE'}
            onClick={deleteAccount}
          >
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}
