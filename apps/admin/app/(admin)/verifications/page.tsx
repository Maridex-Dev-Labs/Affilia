'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { adminApi } from '@/lib/api/admin';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

type VerificationItem = {
  id: string;
  business_name?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
};

export default function Page() {
  const { can, loading: accessLoading } = useAdminAccess();
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await adminApi.verificationQueue();
      setItems(data.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load verification queue.';
      setError(message);
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  const approve = async (id: string) => {
    setError(null);
    try {
      await adminApi.verifyMerchant(id);
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve merchant.';
      setError(message);
    }
  };


  if (accessLoading) return <div className="text-muted">Loading access...</div>;
  if (!can('merchant.verify')) return <div className="card-surface p-6 text-sm text-muted">You do not have permission to access merchant verification requests.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Merchant Verifications</h1>
      {error ? <div className="card-surface p-4 text-sm text-red-300">{error}</div> : null}
      <div className="card-surface p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2">Merchant</th>
              <th className="py-2">Phone</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-t border-soft">
                <td className="py-3">
                  <Link className="underline" href={`/verifications/${m.id}`}>
                    {m.business_name || m.full_name}
                  </Link>
                </td>
                <td className="py-3">{m.phone_number}</td>
                <td className="py-3">
                  <button className="text-xs border border-white/20 rounded-full px-3 py-1" onClick={() => approve(m.id)}>
                    Approve
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-muted">
                  No pending verifications.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
