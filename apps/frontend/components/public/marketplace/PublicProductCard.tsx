import Link from 'next/link';

import type { PublicProduct } from '@/lib/marketplace/public';
import { getPrimaryMediaUrl } from '@/lib/utils/product-media';

export default function PublicProductCard({ product, href }: { product: PublicProduct; href?: string }) {
  const previewUrl = getPrimaryMediaUrl(product);
  return (
    <article className="card-surface overflow-hidden p-0">
      <div className="h-44 bg-white/5">{previewUrl ? <img src={previewUrl} alt={product.title} className="h-full w-full object-cover" /> : null}</div>
      <div className="space-y-3 p-4">
        <div>
          <div className="text-sm font-semibold text-white">{product.title}</div>
          <div className="mt-1 text-xs text-muted">{product.category || 'Marketplace product'}</div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-lg font-black text-white">KES {Number(product.price_kes || 0).toLocaleString()}</div>
          </div>
          <Link className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/5" href={href || `/marketplace/products/${product.id}`}>
            View Product
          </Link>
        </div>
      </div>
    </article>
  );
}
