'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChatsCircle, ClockCounterClockwise, Plus } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { getPrimaryMediaUrl } from '@/lib/utils/product-media';

export default function Page() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });
      setProducts(data || []);
    };

    load();

    const channel = supabase
      .channel(`merchant-products:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `merchant_id=eq.${user.id}` }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const stats = useMemo(() => ({
    total: products.length,
    pending: products.filter((item) => item.moderation_status === 'pending').length,
    approved: products.filter((item) => item.moderation_status === 'approved').length,
  }), [products]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic">My Products</h1>
          <p className="text-muted mt-2">Listings go live only after admin approval. Updates sync here in real time.</p>
        </div>
        <Link className="button-primary rounded-full px-5 py-3 text-sm font-semibold inline-flex items-center gap-2" href="/merchant/products/new">
          <Plus size={18} /> Add Product
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5"><div className="text-sm text-muted">Total Products</div><div className="mt-2 text-3xl font-black">{stats.total}</div></div>
        <div className="card-surface p-5"><div className="text-sm text-muted">Pending Review</div><div className="mt-2 text-3xl font-black text-yellow-400">{stats.pending}</div></div>
        <div className="card-surface p-5"><div className="text-sm text-muted">Approved</div><div className="mt-2 text-3xl font-black text-[#009A44]">{stats.approved}</div></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const previewUrl = getPrimaryMediaUrl(product);
          return (
            <div key={product.id} className="card-surface overflow-hidden">
              <div className="h-48 bg-black/30">
                {previewUrl ? <img src={previewUrl} alt={product.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#7e869a]">No media uploaded</div>}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-white">{product.title}</h2>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${product.moderation_status === 'approved' ? 'bg-[#009A44]/15 text-[#009A44]' : product.moderation_status === 'rejected' ? 'bg-[#BB0000]/15 text-[#BB0000]' : 'bg-yellow-500/15 text-yellow-300'}`}>
                    {product.moderation_status || 'pending'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#9ca5b9] line-clamp-2">{product.description || 'No description yet.'}</p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div><div className="text-[#7e869a]">Price</div><div className="font-bold text-white">KES {product.price_kes}</div></div>
                  <div><div className="text-[#7e869a]">Commission</div><div className="font-bold text-white">{product.commission_percent}%</div></div>
                  <div><div className="text-[#7e869a]">Media</div><div className="font-bold text-white">{Array.isArray(product.media) ? product.media.length : 0}</div></div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link className="rounded-full border border-white/12 px-4 py-2 text-xs font-bold hover:bg-white/5" href={`/merchant/products/${product.id}`}>Edit</Link>
                  <Link className="rounded-full border border-white/12 px-4 py-2 text-xs font-bold hover:bg-white/5" href={`/merchant/products/${product.id}`}>Record Sale</Link>
                  <Link className="rounded-full border border-white/12 px-4 py-2 text-xs font-bold hover:bg-white/5 inline-flex items-center gap-2" href="/merchant/community"><ChatsCircle size={16} /> Community</Link>
                </div>
                {product.moderation_notes ? (
                  <div className="mt-4 rounded-2xl border border-[#BB0000]/15 bg-[#BB0000]/8 p-3 text-xs text-[#f0c5c5] inline-flex items-start gap-2">
                    <ClockCounterClockwise size={16} color="#f0c5c5" /> {product.moderation_notes}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        {products.length === 0 ? <div className="card-surface p-6 text-muted xl:col-span-3">No products yet. Create your first listing and send it for admin review.</div> : null}
      </div>
    </div>
  );
}
