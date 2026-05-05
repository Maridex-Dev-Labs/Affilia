export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';

import PublicProductCard from '@/components/public/marketplace/PublicProductCard';
import { getMerchantCatalog, getPublicMerchant } from '@/lib/marketplace/public';

export default async function PublicShopPage({ params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  const [merchant, products] = await Promise.all([getPublicMerchant(merchantId), getMerchantCatalog(merchantId, 24)]);
  if (!merchant) notFound();

  return (
    <div className="min-h-screen bg-kenya-navy px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="card-surface p-6">
          <div className="flex flex-wrap items-center gap-5">
            {merchant.avatar_url ? <img src={merchant.avatar_url} alt={merchant.business_name || merchant.full_name || 'Merchant'} className="h-20 w-20 rounded-3xl object-cover border border-white/10" /> : <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-2xl font-black">{(merchant.business_name || merchant.full_name || 'M').slice(0, 1).toUpperCase()}</div>}
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">Public Shop</div>
              <h1 className="mt-2 text-4xl font-black italic">{merchant.business_name || merchant.full_name}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#d4dbe7]">{merchant.store_description || 'This merchant has not added a public shop description yet.'}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <PublicProductCard key={product.id} product={product} />
          ))}
          {products.length === 0 ? <div className="text-sm text-muted">No approved products are live in this shop yet.</div> : null}
        </section>
      </div>
    </div>
  );
}
