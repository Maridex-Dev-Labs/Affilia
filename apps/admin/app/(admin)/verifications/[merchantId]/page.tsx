'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/admin-client';

type MerchantDetail = {
  business_name?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  business_verified?: boolean | null;
  mpesa_till?: string | null;
  documents?: Record<string, unknown> | null;
};

export default function Page() {
  const params = useParams<{ merchantId: string }>();
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', params.merchantId).single().then(({ data }) => setMerchant(data));
  }, [params.merchantId]);

  if (!merchant) return <div className="text-muted">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{merchant.business_name || merchant.full_name}</h1>
      <div className="card-surface p-6 space-y-2">
        <p>Phone: {merchant.phone_number}</p>
        <p>Verified: {merchant.business_verified ? 'Yes' : 'No'}</p>
        <p>M-Pesa Till: {merchant.mpesa_till}</p>
        <p>Documents: {JSON.stringify(merchant.documents || {})}</p>
      </div>
    </div>
  );
}
