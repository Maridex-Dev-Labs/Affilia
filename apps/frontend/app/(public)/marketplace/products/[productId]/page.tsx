import Link from 'next/link';
import { notFound } from 'next/navigation';

import PublicProductCard from '@/components/public/marketplace/PublicProductCard';
import { getPrimaryMediaUrl } from '@/lib/utils/product-media';
import { getPublicMerchant, getPublicProduct, getRelatedMarketplaceProducts } from '@/lib/marketplace/public';

export default async function PublicProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { productId } = await params;
  const resolvedSearchParams = await searchParams;
  const referralCode = typeof resolvedSearchParams.ref === 'string' ? resolvedSearchParams.ref : null;

  const product = await getPublicProduct(productId);
  if (!product) notFound();

  const [merchant, related] = await Promise.all([
    getPublicMerchant(product.merchant_id),
    getRelatedMarketplaceProducts({ excludeId: product.id, merchantId: product.merchant_id, category: product.category, limit: 6 }),
  ]);
  const previewUrl = getPrimaryMediaUrl(product);

  return (
    <div className="min-h-screen bg-kenya-navy px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        {referralCode ? (
          <div className="card-surface p-4 text-sm text-[#d4dbe7]">
            You are viewing this product through referral code <span className="font-mono text-white">{referralCode}</span>. If you buy through this route, attribution stays attached to the referring affiliate.
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="card-surface overflow-hidden p-0">
            <div className="h-[420px] bg-black/30">{previewUrl ? <img src={previewUrl} alt={product.title} className="h-full w-full object-cover" /> : null}</div>
            <div className="space-y-5 p-6">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">{product.category || 'Marketplace listing'}</div>
                <h1 className="mt-3 text-4xl font-black italic">{product.title}</h1>
              </div>
              <p className="text-sm leading-7 text-[#d4dbe7]">{product.description || 'No description provided yet.'}</p>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="card-surface p-6 space-y-4">
              <div>
                <div className="text-sm text-muted">Price</div>
                <div className="mt-2 text-4xl font-black">KES {Number(product.price_kes || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted">Affiliate commission</div>
                <div className="mt-2 text-2xl font-bold text-[#009A44]">{Number(product.commission_percent || 0)}%</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-[#d4dbe7]">
                Public product page only. Buyers can inspect the listing and the shop. Checkout and sale verification still happen through the merchant's normal fulfilment flow.
              </div>
            </div>

            <div className="card-surface p-6 space-y-4">
              <div className="flex items-center gap-4">
                {merchant?.avatar_url ? <img src={merchant.avatar_url} alt={merchant.business_name || merchant.full_name || 'Merchant'} className="h-16 w-16 rounded-2xl object-cover border border-white/10" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-black">{(merchant?.business_name || merchant?.full_name || 'M').slice(0, 1).toUpperCase()}</div>}
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">Shop owner</div>
                  <div className="mt-1 text-xl font-black text-white">{merchant?.business_name || merchant?.full_name || 'Merchant'}</div>
                </div>
              </div>
              <p className="text-sm leading-7 text-[#d4dbe7]">{merchant?.store_description || 'This merchant has not added a public store description yet.'}</p>
              <Link href={`/marketplace/shops/${product.merchant_id}`} className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/5">
                View Full Shop
              </Link>
            </div>
          </aside>
        </div>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">Related Listings</div>
              <h2 className="mt-2 text-2xl font-black italic">More From This Category Or Shop</h2>
            </div>
            <Link href="/marketplace" className="text-sm text-white/80 underline-offset-4 hover:underline">Browse all products</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((item) => (
              <PublicProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
