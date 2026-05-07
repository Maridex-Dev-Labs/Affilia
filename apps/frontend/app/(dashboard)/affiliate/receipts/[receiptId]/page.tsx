'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { receiptsApi } from '@/lib/api/receipts';
import { isBackendUnavailableError } from '@/lib/api/client';
import { getReceiptFallback } from '@/lib/api/fallbacks';
import { sanitizeUserFacingError } from '@/lib/errors';
import ReceiptViewer from '@/components/shared/Receipt/ReceiptViewer';

type ReceiptDetail = {
  receipt_number: string;
  receipt_type: string;
  amount_kes: number;
  mpesa_reference?: string | null;
  generated_at: string;
  verification_hash?: string | null;
};

export default function Page() {
  const params = useParams<{ receiptId: string }>();
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const data = await receiptsApi.get(params.receiptId).catch(async (err) => {
          if (isBackendUnavailableError(err)) {
            return getReceiptFallback(params.receiptId);
          }
          throw err;
        });
        setReceipt(data);
      } catch (err: unknown) {
        setError(sanitizeUserFacingError(err, 'This receipt is temporarily unavailable.'));
      }
    };

    load();
  }, [params.receiptId]);

  if (error) return <div className="card-surface p-6 text-sm text-red-300">{error}</div>;
  if (!receipt) return <div className="text-muted">Loading receipt...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black italic">Receipt {receipt.receipt_number}</h1>
        <p className="mt-2 text-sm text-muted">Official Affilia transaction receipt with watermark, receipt metadata, and verification hash.</p>
      </div>
      <ReceiptViewer
        receipt={{
          receipt_number: receipt.receipt_number,
          recipient: 'Affilia account holder',
          amount_kes: receipt.amount_kes,
          mpesa_reference: receipt.mpesa_reference || undefined,
          generated_at: receipt.generated_at,
          receipt_type: receipt.receipt_type,
          verification_hash: receipt.verification_hash || undefined,
        }}
      />
    </div>
  );
}
