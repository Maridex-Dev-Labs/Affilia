'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/admin-client';

export default function Page({ params }: { params: { merchantId: string } }) {
  const [merchant, setMerchant] = useState<any>(null);

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
