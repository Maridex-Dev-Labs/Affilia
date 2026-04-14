'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { receiptsApi } from '@/lib/api/receipts';

type ReceiptDetail = {
  receipt_number: string;
  receipt_type: string;
  amount_kes: number;
  mpesa_reference?: string | null;
  generated_at: string;
};

export default function Page() {
  const params = useParams<{ receiptId: string }>();
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const data = await receiptsApi.get(params.receiptId);
        setReceipt(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load receipt.';
        setError(message);
      }
    };

    load();
  }, [params.receiptId]);

  if (error) return <div className="card-surface p-6 text-sm text-red-300">{error}</div>;
  if (!receipt) return <div className="text-muted">Loading receipt...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Receipt {receipt.receipt_number}</h1>
      <div className="card-surface p-6 space-y-2">
        <p>Type: {receipt.receipt_type}</p>
        <p>Amount: KES {receipt.amount_kes}</p>
        <p>Reference: {receipt.mpesa_reference || '—'}</p>
        <p>Date: {new Date(receipt.generated_at).toLocaleString('en-KE')}</p>
      </div>
    </div>
  );
}
