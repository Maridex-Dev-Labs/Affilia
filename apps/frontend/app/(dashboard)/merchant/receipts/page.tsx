'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { receiptsApi } from '@/lib/api/receipts';
import { isBackendUnavailableError } from '@/lib/api/client';
import { listReceiptsFallback } from '@/lib/api/fallbacks';

type ReceiptRow = {
  id: string;
  receipt_number: string;
  receipt_type: string;
  amount_kes: number;
  generated_at: string;
};

export default function Page() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await receiptsApi.list().catch(async (err) => {
          if (isBackendUnavailableError(err)) {
            return listReceiptsFallback();
          }
          throw err;
        });
        setReceipts(data.items || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load receipts.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="text-muted">Loading receipts...</div>;
  if (error) return <div className="card-surface p-6 text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Receipts</h1>
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Receipt</th>
              <th className="py-2">Type</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Date</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id} className="border-t border-soft">
                <td className="py-3">{r.receipt_number}</td>
                <td className="py-3">{r.receipt_type}</td>
                <td className="py-3">KES {r.amount_kes}</td>
                <td className="py-3">{new Date(r.generated_at).toLocaleDateString()}</td>
                <td className="py-3">
                  <Link className="text-xs underline" href={`/merchant/receipts/${r.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr>
                <td className="py-6 text-muted" colSpan={5}>
                  No receipts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
