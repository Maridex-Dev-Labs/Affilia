import 'server-only';

const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export type PublicMerchant = {
  id: string;
  business_name?: string | null;
  full_name?: string | null;
  store_description?: string | null;
  avatar_url?: string | null;
};

export type PublicProduct = {
  id: string;
  merchant_id: string;
  title: string;
  description?: string | null;
  price_kes: number;
  commission_percent: number;
  media?: Array<{ type?: string; url?: string }> | null;
  images?: string[] | null;
  category?: string | null;
  stock_status?: string | null;
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Public marketplace request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getPublicMarketplaceProducts(limit = 24): Promise<PublicProduct[]> {
  const data = await fetchJson<{ items: PublicProduct[] }>(`/api/public/marketplace?limit=${limit}`);
  return data.items || [];
}

export async function getPublicProduct(productId: string): Promise<PublicProduct | null> {
  try {
    const data = await fetchJson<{ product: PublicProduct }>(`/api/public/marketplace/products/${productId}`);
    return data.product || null;
  } catch {
    return null;
  }
}

export async function getPublicMerchant(merchantId: string): Promise<PublicMerchant | null> {
  try {
    const data = await fetchJson<{ merchant: PublicMerchant; products: PublicProduct[] }>(`/api/public/marketplace/shops/${merchantId}`);
    return data.merchant || null;
  } catch {
    return null;
  }
}

export async function getRelatedMarketplaceProducts(input: { excludeId: string; merchantId: string; category?: string | null; limit?: number }): Promise<PublicProduct[]> {
  const product = await getPublicProduct(input.excludeId);
  const data = product ? await fetchJson<{ product: PublicProduct; merchant: PublicMerchant | null; related: PublicProduct[] }>(`/api/public/marketplace/products/${input.excludeId}`) : null;
  const related = data?.related || [];
  return related.slice(0, input.limit || 8);
}

export async function getMerchantCatalog(merchantId: string, _limit = 24): Promise<PublicProduct[]> {
  try {
    const data = await fetchJson<{ merchant: PublicMerchant; products: PublicProduct[] }>(`/api/public/marketplace/shops/${merchantId}`);
    return data.products || [];
  } catch {
    return [];
  }
}
