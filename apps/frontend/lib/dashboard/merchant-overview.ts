import { supabase } from '@/lib/supabase/client';

type MerchantTransaction = {
  id: string;
  product_id: string;
  product_title?: string;
  affiliate_id: string;
  affiliate_name?: string;
  order_value_kes: number;
  commission_earned_kes: number;
  status: string;
};

export type MerchantOverviewData = {
  stats: {
    escrow_balance: number;
    products: number;
    affiliates: number;
    sales_total: number;
  };
  recent_transactions: MerchantTransaction[];
  pending_actions: string[];
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loadMerchantOverview(userId: string): Promise<MerchantOverviewData> {
  const [escrowResult, productsResult, conversionsResult, depositsResult] = await Promise.all([
    supabase.from('merchant_escrow').select('balance_kes').eq('merchant_id', userId).maybeSingle(),
    supabase
      .from('products')
      .select('id, title, moderation_status, is_active')
      .eq('merchant_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('conversions')
      .select('id, product_id, affiliate_id, order_value_kes, commission_earned_kes, status, created_at')
      .eq('merchant_id', userId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('deposit_requests').select('id, status').eq('merchant_id', userId),
  ]);

  const possibleError =
    escrowResult.error || productsResult.error || conversionsResult.error || depositsResult.error;
  if (possibleError) {
    throw new Error(possibleError.message);
  }

  const products = productsResult.data || [];
  const conversions = conversionsResult.data || [];
  const productIds = products.map((item) => item.id);
  const affiliateIds = Array.from(new Set(conversions.map((row) => row.affiliate_id).filter(Boolean)));

  const [linksResult, profilesResult] = await Promise.all([
    productIds.length
      ? supabase.from('affiliate_links').select('affiliate_id').in('product_id', productIds)
      : Promise.resolve({ data: [], error: null }),
    affiliateIds.length
      ? supabase.from('profiles').select('id, full_name, business_name').in('id', affiliateIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const secondaryError = linksResult.error || profilesResult.error;
  if (secondaryError) {
    throw new Error(secondaryError.message);
  }

  const uniqueAffiliates = new Set((linksResult.data || []).map((row) => row.affiliate_id).filter(Boolean));
  const profileMap = new Map(
    (profilesResult.data || []).map((profile) => [
      profile.id,
      profile.business_name || profile.full_name || profile.id,
    ]),
  );
  const productMap = new Map(products.map((product) => [product.id, product.title]));

  const salesTotal = conversions.reduce((sum, row) => sum + toNumber(row.order_value_kes), 0);
  const pendingProducts = products.filter((item) => item.moderation_status === 'pending').length;
  const pendingDeposits = (depositsResult.data || []).filter((item) => item.status === 'pending').length;
  const pendingOrders = conversions.filter((item) => item.status === 'pending').length;

  const pendingActions: string[] = [];
  if (pendingProducts > 0) {
    pendingActions.push(`${pendingProducts} product${pendingProducts === 1 ? '' : 's'} waiting for admin review.`);
  }
  if (pendingDeposits > 0) {
    pendingActions.push(`${pendingDeposits} deposit request${pendingDeposits === 1 ? '' : 's'} pending approval.`);
  }
  if (pendingOrders > 0) {
    pendingActions.push(`${pendingOrders} conversion${pendingOrders === 1 ? '' : 's'} awaiting merchant action.`);
  }

  return {
    stats: {
      escrow_balance: toNumber(escrowResult.data?.balance_kes),
      products: products.filter((item) => item.is_active).length,
      affiliates: uniqueAffiliates.size,
      sales_total: salesTotal,
    },
    recent_transactions: conversions.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      product_title: productMap.get(row.product_id),
      affiliate_id: row.affiliate_id,
      affiliate_name: profileMap.get(row.affiliate_id),
      order_value_kes: toNumber(row.order_value_kes),
      commission_earned_kes: toNumber(row.commission_earned_kes),
      status: row.status,
    })),
    pending_actions: pendingActions,
  };
}
