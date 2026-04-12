'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function Page({ params }: { params: { receiptId: string } }) {
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    supabase.from('official_receipts').select('*').eq('id', params.receiptId).single().then(({ data }) => {
      setReceipt(data);
    });
  }, [params.receiptId]);

  if (!receipt) return <div className="text-muted">Loading receipt...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Receipt {receipt.receipt_number}</h1>
      <div className="card-surface p-6">
        <p>Type: {receipt.receipt_type}</p>
        <p>Amount: KES {receipt.amount_kes}</p>
        <p>Reference: {receipt.mpesa_reference}</p>
      </div>
    </div>
  );
}
