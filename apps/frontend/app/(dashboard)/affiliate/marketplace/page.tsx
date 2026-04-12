'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Funnel } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/client';
import { getPrimaryMediaUrl } from '@/lib/utils/product-media';

export default function Page() {
  const [items, setItems] = useState<any[]>([]);
  const [highCommissionOnly, setHighCommissionOnly] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('moderation_status', 'approved');
      setItems(data || []);
    };
    load();
    const channel = supabase
      .channel('affiliate-marketplace')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredItems = highCommissionOnly ? items.filter((item) => Number(item.commission_percent || 0) >= 15) : items;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic">Marketplace</h1>
          <p className="text-muted mt-2">Only admin-approved listings appear here, and updates stream in real time.</p>
        </div>
        <button className={`rounded-full px-4 py-2 text-xs font-bold inline-flex items-center gap-2 transition ${highCommissionOnly ? 'button-primary' : 'border border-white/20'}`} onClick={() => setHighCommissionOnly((value) => !value)} type="button">
          <Funnel size={14} /> {highCommissionOnly ? 'Showing 15%+ Commission' : 'Filter 15%+ Commission'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filteredItems.map((item) => {
          const previewUrl = getPrimaryMediaUrl(item);
          return (
            <div key={item.id} className="card-surface overflow-hidden p-0">
              <div className="h-40 bg-white/5">{previewUrl ? <img src={previewUrl} alt={item.title} className="h-full w-full object-cover" /> : null}</div>
              <div className="p-4">
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="text-xs text-muted">KES {item.price_kes}</div>
                <div className="text-xs text-muted">{item.commission_percent}% commission</div>
                <Link className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-white/20 py-2 text-xs transition hover:bg-white/5" href={`/affiliate/marketplace/${item.id}`}>
                  Get Link
                </Link>
              </div>
            </div>
          );
        })}
        {filteredItems.length === 0 ? <div className="text-muted">No products matched that filter.</div> : null}
      </div>
    </div>
  );
}
