export const dynamic = 'force-dynamic';

import Link from 'next/link';

import PublicProductCard from '@/components/public/marketplace/PublicProductCard';
import { getPublicMarketplaceProducts } from '@/lib/marketplace/public';

export default async function PublicMarketplacePage() {
  const items = await getPublicMarketplaceProducts(24);

  return (
    <div className="min-h-screen bg-kenya-navy px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">Public Marketplace</div>
            <h1 className="mt-3 text-4xl font-black italic">Discover Products Anyone Can Browse</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#cfd5e1]">
              Visitors can inspect the product, see the merchant behind it, compare related listings, and move deeper into the shop before buying.
            </p>
          </div>
          <Link href="/signup" className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/5">
            Join Affilia
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((product) => (
            <PublicProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
