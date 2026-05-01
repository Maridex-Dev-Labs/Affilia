'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { merchantApi } from '@/lib/api/merchant';
import { isBackendUnavailableError } from '@/lib/api/client';
import { loadEscrowFallback } from '@/lib/api/fallbacks';
import { sanitizeUserFacingError } from '@/lib/errors';
import MpesaDepositForm from '@/components/forms/MpesaDepositForm/MpesaDepositForm';
import { formatCurrency } from '@/lib/utils/format';

type EscrowState = {
  balance_kes: number;
};

type DepositRow = {
  id: string;
  created_at: string;
  amount_kes: number;
  mpesa_code?: string | null;
  status: string;
};

export default function Page() {
  const [escrow, setEscrow] = useState<EscrowState | null>(null);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await merchantApi.escrow().catch(async (err) => {
        if (isBackendUnavailableError(err)) {
          return loadEscrowFallback();
        }
        throw err;
      });
      setEscrow({ balance_kes: data.balance || 0 });
      setDeposits(data.deposits || []);
    } catch (err: unknown) {
      setError(sanitizeUserFacingError(err, 'Escrow information is temporarily unavailable.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="text-muted">Loading escrow...</div>;
  }

  if (error) {
    return <div className="card-surface p-6 text-sm text-red-300">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Escrow Management</h1>

      <div className="card-surface p-8 mt-6 text-center">
        <p className="text-muted">Available Escrow Vault Balance</p>
        <div className="text-4xl font-extrabold mt-2">{formatCurrency(escrow?.balance_kes || 0)}</div>
        <div className="mt-6 flex justify-center gap-4">
          <Link className="button-primary rounded-full px-5 py-3 text-sm" href="#deposit-form">
            Deposit Funds
          </Link>
          <Link className="border border-white/20 rounded-full px-5 py-3 text-sm hover:bg-white/5 transition" href="/merchant/settings">
            Request Withdrawal
          </Link>
        </div>
      </div>

      <div className="card-surface p-6 mt-6" id="deposit-form">
        <h3 className="text-lg font-bold">Deposit History</h3>
        <div className="mt-4 space-y-2 text-sm text-muted">
          {deposits.map((d) => (
            <div key={d.id} className="flex justify-between border-b border-soft pb-2">
              <span>
                {new Date(d.created_at).toLocaleDateString('en-KE')} · {formatCurrency(d.amount_kes)} · {d.mpesa_code || '—'}
              </span>
              <span className="capitalize">{d.status}</span>
            </div>
          ))}
          {deposits.length === 0 && <div className="text-muted">No deposits yet.</div>}
        </div>
      </div>

      <div className="card-surface p-6 mt-6">
        <h3 className="text-lg font-bold">How to Deposit Funds</h3>
        <ol className="mt-3 space-y-2 text-sm text-muted list-decimal list-inside">
          <li>Send M-Pesa to Maridex Pochi la Biashara: 884422</li>
          <li>Upload M-Pesa confirmation screenshot</li>
          <li>Funds credited after admin verification (2-4 hours)</li>
        </ol>
        <div className="mt-4">
          <MpesaDepositForm onCreated={load} />
        </div>
      </div>
    </div>
  );
}
