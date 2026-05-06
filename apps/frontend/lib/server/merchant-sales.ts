import 'server-only';

import { createServiceRoleClient } from '@/lib/server/supabase-service';

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

type ManualSalePayload = {
  product_id: string;
  affiliate_code: string;
  sale_amount_kes: number;
  quantity: number;
  customer_reference: string;
  notes?: string | null;
};

async function requireMerchantProfile(userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .eq('role', 'merchant')
    .single();

  if (error || !data) {
    throw new Error('You do not have access to this workspace.');
  }

  return data;
}

async function ensureMerchantOperationalAccess(userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('profile_plan_selections')
    .select('id, plan_code, status')
    .eq('profile_id', userId)
    .eq('role', 'merchant')
    .eq('status', 'active')
    .order('activated_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error('This workspace is temporarily unavailable. Please try again later.');
  }

  if ((data || []).length === 0) {
    return { plan_code: 'merchant_free', status: 'active' };
  }

  return data![0];
}

export async function submitMerchantAffiliateSale(userId: string, payload: ManualSalePayload) {
  const supabase = createServiceRoleClient();
  await requireMerchantProfile(userId);
  await ensureMerchantOperationalAccess(userId);

  const productId = payload.product_id;
  const affiliateCode = payload.affiliate_code.trim().toUpperCase();
  const quantity = Math.max(1, Math.trunc(Number(payload.quantity || 1)));
  const unitSaleAmount = toNumber(payload.sale_amount_kes);
  const customerReference = payload.customer_reference.trim();

  if (!productId) throw new Error('Product selection mismatch.');
  if (!affiliateCode) throw new Error('Enter an affiliate or promo code.');
  if (unitSaleAmount <= 0) throw new Error('Enter a valid sale amount.');
  if (!customerReference) throw new Error('Enter a customer or order reference.');

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('merchant_id', userId)
    .eq('is_active', true)
    .eq('moderation_status', 'approved')
    .single();

  if (productError || !product) {
    throw new Error('Product not found or not eligible for affiliate sales.');
  }

  const { data: link, error: linkError } = await supabase
    .from('affiliate_links')
    .select('*')
    .eq('unique_code', affiliateCode)
    .eq('product_id', productId)
    .single();

  if (linkError || !link) {
    throw new Error('Affiliate code not found for this product.');
  }
  if (link.status !== 'active') {
    throw new Error('This affiliate code is not active.');
  }

  const { data: affiliate, error: affiliateError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', link.affiliate_id)
    .eq('role', 'affiliate')
    .single();

  if (affiliateError || !affiliate) {
    throw new Error('Affiliate profile not found.');
  }
  if (affiliate.affiliate_verification_status !== 'verified') {
    throw new Error('The affiliate tied to this code is not verified yet.');
  }

  const { data: affiliatePlanRows, error: affiliatePlanError } = await supabase
    .from('profile_plan_selections')
    .select('plan_code, status')
    .eq('profile_id', affiliate.id)
    .eq('role', 'affiliate')
    .eq('status', 'active')
    .order('activated_at', { ascending: false })
    .limit(1);

  if (affiliatePlanError) {
    throw new Error('This workspace is temporarily unavailable. Please try again later.');
  }

  const affiliatePlan = (affiliatePlanRows || [])[0] || { plan_code: 'affiliate_starter', status: 'active' };
  if (affiliatePlan.status !== 'active') {
    throw new Error('The affiliate tied to this code does not have an active package.');
  }

  const { data: duplicateRows, error: duplicateError } = await supabase
    .from('conversions')
    .select('id')
    .eq('merchant_id', userId)
    .eq('product_id', productId)
    .eq('customer_reference', customerReference)
    .limit(1);

  if (duplicateError) {
    throw new Error('This workspace is temporarily unavailable. Please try again later.');
  }
  if ((duplicateRows || []).length > 0) {
    throw new Error('This customer or order reference has already been submitted.');
  }

  const { data: escrow, error: escrowError } = await supabase
    .from('merchant_escrow')
    .select('*')
    .eq('merchant_id', userId)
    .single();

  if (escrowError || !escrow) {
    throw new Error('Fund your merchant escrow before recording affiliate sales.');
  }

  const orderValue = Math.round(unitSaleAmount * quantity * 100) / 100;
  const commissionPercent = toNumber(product.commission_percent);
  const commission = Math.round(orderValue * commissionPercent) / 100;
  const platformFee = Math.round(commission * 0.05 * 100) / 100;

  if (toNumber(escrow.balance_kes) < commission) {
    throw new Error('Your available escrow balance is too low for this commission.');
  }

  const reservedBalance = toNumber(escrow.reserved_balance_kes);
  const updatedEscrow = {
    balance_kes: toNumber(escrow.balance_kes) - commission,
    reserved_balance_kes: reservedBalance + commission,
    updated_at: new Date().toISOString(),
  };

  const { error: escrowUpdateError } = await supabase
    .from('merchant_escrow')
    .update(updatedEscrow)
    .eq('id', escrow.id);

  if (escrowUpdateError) {
    throw new Error('This workspace is temporarily unavailable. Please try again later.');
  }

  const conversionPayload = {
    link_id: link.id,
    affiliate_id: affiliate.id,
    merchant_id: userId,
    product_id: productId,
    order_value_kes: orderValue,
    commission_earned_kes: commission,
    platform_fee_kes: platformFee,
    status: 'pending',
    merchant_approved: true,
    quantity,
    customer_reference: customerReference,
    entry_mode: 'manual',
    submitted_by: userId,
    reserved_commission_kes: commission,
    review_notes: payload.notes || null,
  };

  const { data: conversionRows, error: conversionError } = await supabase
    .from('conversions')
    .insert(conversionPayload)
    .select('*')
    .limit(1);

  if (conversionError) {
    await supabase
      .from('merchant_escrow')
      .update({
        balance_kes: toNumber(escrow.balance_kes),
        reserved_balance_kes: reservedBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrow.id);

    if (conversionError.code === '23505') {
      throw new Error('This customer or order reference has already been submitted.');
    }
    throw new Error('This workspace is temporarily unavailable. Please try again later.');
  }

  return {
    status: 'submitted',
    conversion: conversionRows?.[0] || null,
    commission_kes: commission,
    commission_percent: commissionPercent,
    platform_fee_kes: platformFee,
    order_value_kes: orderValue,
    unit_sale_amount_kes: unitSaleAmount,
    quantity,
    affiliate_id: affiliate.id,
    affiliate_name: affiliate.full_name || affiliate.business_name || affiliate.id,
  };
}
