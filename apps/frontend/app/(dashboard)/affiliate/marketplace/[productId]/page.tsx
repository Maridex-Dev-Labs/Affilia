'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowClockwise } from '@phosphor-icons/react';

import { affiliateApi } from '@/lib/api/affiliate';
import { isBackendUnavailableError } from '@/lib/api/client';
import { generateAffiliateLinkFallback } from '@/lib/api/fallbacks';
import { supabase } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import { getPrimaryMediaUrl } from '@/lib/utils/product-media';

type ProductDetail = {
  id: string;
  title: string;
  description?: string | null;
  price_kes: number;
  commission_percent: number;
  media?: Array<{ type: 'image' | 'video'; url: string }>;
};

export default function Page() {
  const params = useParams<{ productId: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('id', params.productId)
      .eq('is_active', true)
      .eq('moderation_status', 'approved')
      .single()
      .then(({ data }) => setProduct(data));
  }, [params.productId]);

  const previewUrl = useMemo(() => getPrimaryMediaUrl(product), [product]);

  const generateLink = async () => {
    try {
      const data = await affiliateApi.generateLink({ product_id: params.productId }).catch(async (err) => {
        if (isBackendUnavailableError(err)) {
          return generateAffiliateLinkFallback(params.productId);
        }
        throw err;
      });
      setStatus(`Smart link created: ${data.code}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate link.';
      setStatus(message);
    }
  };

  if (!product) return <div className="text-muted">Loading...</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div className="card-surface overflow-hidden p-0">
        <div className="h-[360px] bg-black/30">
          {previewUrl ? (
            product.media?.[0]?.type === 'video' ? <video src={previewUrl} controls className="h-full w-full object-cover" /> : <img src={previewUrl} alt={product.title} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="p-6">
          <h1 className="text-3xl font-black italic">{product.title}</h1>
          <p className="mt-4 text-sm leading-7 text-[#d4dbe7]">{product.description || 'No description yet.'}</p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="card-surface p-6 space-y-3">
          <div className="text-sm text-muted">Price</div>
          <div className="text-3xl font-black">KES {product.price_kes}</div>
          <div className="text-sm text-muted">Commission</div>
          <div className="text-xl font-bold text-[#009A44]">{product.commission_percent}%</div>
          <Button onClick={generateLink}>Generate Link</Button>
          {status ? <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-[#cfd5e1]">{status}</div> : null}
        </div>
        <div className="card-surface p-6 text-sm text-[#cfd5e1]">
          <div className="mb-3 flex items-center gap-2 font-bold text-white"><ArrowClockwise size={18} /> Review status</div>
          This listing is live because it has already passed merchant and admin review checks.
        </div>
      </div>
    </div>
  );
}
