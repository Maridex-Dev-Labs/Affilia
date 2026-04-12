'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import MpesaDepositForm from '@/components/forms/MpesaDepositForm/MpesaDepositForm';
import { formatCurrency } from '@/lib/utils/format';

export default function Page() {
  const { user } = useAuth();
  const [escrow, setEscrow] = useState<any>(null);
  const [deposits, setDeposits] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data: escrowData } = await supabase.from('merchant_escrow').select('*').eq('merchant_id', user.id).single();
    const { data: depositData } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('merchant_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setEscrow(escrowData || null);
    setDeposits(depositData || []);
  };

  useEffect(() => {
    load();
  }, [user]);

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
