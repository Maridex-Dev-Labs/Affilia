'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Page() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('official_receipts')
      .select('*')
      .eq('recipient_id', user.id)
      .order('generated_at', { ascending: false })
      .then(({ data }) => setReceipts(data || []));
  }, [user]);

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
