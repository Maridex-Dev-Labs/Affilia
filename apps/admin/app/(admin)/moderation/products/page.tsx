'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, ClockCounterClockwise, XCircle } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/admin-client';
import { logAdminAction } from '@/lib/security/audit-logger';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

export default function Page() {
  const { can, loading: accessLoading } = useAdminAccess();
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setItems(data || []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-product-moderation')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const review = async (product: any, moderation_status: 'approved' | 'rejected') => {
    const note = notes[product.id] || null;
    await supabase.from('products').update({
      moderation_status,
      moderation_notes: note,
      is_active: moderation_status === 'approved',
      approved_at: moderation_status === 'approved' ? new Date().toISOString() : null,
      approved_by: moderation_status === 'approved' ? (await supabase.auth.getUser()).data.user?.id : null,
      rejected_at: moderation_status === 'rejected' ? new Date().toISOString() : null,
    }).eq('id', product.id);
    await logAdminAction(`product_${moderation_status}`, 'product', product.id);
    load();
  };

  if (accessLoading) return <div className="text-muted">Loading access...</div>;
  if (!can('product.review')) return <div className="card-surface p-6 text-sm text-muted">You do not have permission to review products.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black italic">Product Moderation</h1>
        <p className="text-muted mt-2">Every merchant listing is reviewed here before it becomes visible to affiliates.</p>
      </div>
      <div className="space-y-4">
        {items.map((product) => (
          <div key={product.id} className="card-surface p-6">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                {product.media?.[0]?.url ? (
                  product.media?.[0]?.type === 'video' ? (
                    <video src={product.media[0].url} controls className="h-60 w-full rounded-3xl object-cover" />
                  ) : (
                    <img src={product.media[0].url} alt={product.title} className="h-60 w-full rounded-3xl object-cover" />
                  )
                ) : (
                  <div className="flex h-60 items-center justify-center rounded-3xl bg-black/30 text-[#7e869a]">No media uploaded</div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{product.title}</h2>
                    <p className="text-sm text-[#9aa2b5] mt-2">{product.description || 'No description provided.'}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${product.moderation_status === 'approved' ? 'bg-[#009A44]/15 text-[#009A44]' : product.moderation_status === 'rejected' ? 'bg-[#BB0000]/15 text-[#BB0000]' : 'bg-yellow-500/15 text-yellow-300'}`}>{product.moderation_status}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><div className="text-[#7e869a]">Price</div><div className="font-bold text-white">KES {product.price_kes}</div></div>
                  <div><div className="text-[#7e869a]">Commission</div><div className="font-bold text-white">{product.commission_percent}%</div></div>
                  <div><div className="text-[#7e869a]">Assets</div><div className="font-bold text-white">{Array.isArray(product.media) ? product.media.length : 0}</div></div>
                </div>
                <textarea
                  className="input-shell min-h-[120px]"
                  placeholder="Add review notes or rejection feedback for the merchant"
                  value={notes[product.id] ?? product.moderation_notes ?? ''}
                  onChange={(e) => setNotes((current) => ({ ...current, [product.id]: e.target.value }))}
                />
                <div className="flex flex-wrap gap-3">
                  <button className="button-primary rounded-full px-4 py-2 text-xs font-bold inline-flex items-center gap-2" onClick={() => review(product, 'approved')}>
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button className="rounded-full bg-[#BB0000] px-4 py-2 text-xs font-bold text-white inline-flex items-center gap-2" onClick={() => review(product, 'rejected')}>
                    <XCircle size={16} /> Reject
                  </button>
                </div>
                {product.moderation_notes ? <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-[#cfd5e1] inline-flex gap-2"><ClockCounterClockwise size={16} className="mt-0.5" /> {product.moderation_notes}</div> : null}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 ? <div className="card-surface p-6 text-muted">No products submitted yet.</div> : null}
      </div>
    </div>
  );
}
