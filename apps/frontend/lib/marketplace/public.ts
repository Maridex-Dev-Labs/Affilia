import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

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

function admin() {
  return createAdminClient();
}

export async function getPublicMarketplaceProducts(limit = 24): Promise<PublicProduct[]> {
  const { data, error } = await admin()
    .from('products')
    .select('id,merchant_id,title,description,price_kes,commission_percent,media,images,category,stock_status')
    .eq('is_active', true)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return (data || []) as PublicProduct[];
}

export async function getPublicProduct(productId: string): Promise<PublicProduct | null> {
  const { data, error } = await admin()
    .from('products')
    .select('id,merchant_id,title,description,price_kes,commission_percent,media,images,category,stock_status')
    .eq('id', productId)
    .eq('is_active', true)
    .eq('moderation_status', 'approved')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as PublicProduct | null) || null;
}

export async function getPublicMerchant(merchantId: string): Promise<PublicMerchant | null> {
  const { data, error } = await admin()
    .from('profiles')
    .select('id,business_name,full_name,store_description,avatar_url')
    .eq('id', merchantId)
    .eq('role', 'merchant')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as PublicMerchant | null) || null;
}

export async function getRelatedMarketplaceProducts(input: { excludeId: string; merchantId: string; category?: string | null; limit?: number }): Promise<PublicProduct[]> {
  const supabase = admin();
  const limit = input.limit || 8;

  let query = supabase
    .from('products')
    .select('id,merchant_id,title,description,price_kes,commission_percent,media,images,category,stock_status')
    .eq('is_active', true)
    .eq('moderation_status', 'approved')
    .neq('id', input.excludeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (input.category) {
    query = query.eq('category', input.category);
  } else {
    query = query.eq('merchant_id', input.merchantId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  let items = (data || []) as PublicProduct[];

  if (items.length < limit && input.category) {
    const { data: fallback, error: fallbackError } = await supabase
      .from('products')
      .select('id,merchant_id,title,description,price_kes,commission_percent,media,images,category,stock_status')
      .eq('is_active', true)
      .eq('moderation_status', 'approved')
      .eq('merchant_id', input.merchantId)
      .neq('id', input.excludeId)
      .order('created_at', { ascending: false })
      .limit(limit - items.length);
    if (!fallbackError) {
      const existing = new Set(items.map((item) => item.id));
      items = items.concat(((fallback || []) as PublicProduct[]).filter((item) => !existing.has(item.id)));
    }
  }

  return items;
}

export async function getMerchantCatalog(merchantId: string, limit = 24): Promise<PublicProduct[]> {
  const { data, error } = await admin()
    .from('products')
    .select('id,merchant_id,title,description,price_kes,commission_percent,media,images,category,stock_status')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return (data || []) as PublicProduct[];
}
