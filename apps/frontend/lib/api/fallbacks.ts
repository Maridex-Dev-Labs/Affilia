import { supabase } from '@/lib/supabase/client';
import { buildPublicProductLink } from '@/lib/links/smart-links';

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function requireUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Please sign in again.');
  }
  return user.id;
}

export async function loadEscrowFallback() {
  const userId = await requireUserId();
  const [escrowResult, depositsResult] = await Promise.all([
    supabase.from('merchant_escrow').select('balance_kes, reserved_balance_kes').eq('merchant_id', userId).maybeSingle(),
    supabase.from('deposit_requests').select('*').eq('merchant_id', userId).order('created_at', { ascending: false }).limit(10),
  ]);
  if (escrowResult.error || depositsResult.error) {
    throw new Error(escrowResult.error?.message || depositsResult.error?.message || 'Failed to load escrow data.');
  }
  return {
    balance: toNumber(escrowResult.data?.balance_kes),
    reserved_balance: toNumber(escrowResult.data?.reserved_balance_kes),
    deposits: depositsResult.data || [],
  };
}

export async function submitDepositFallback(payload: { amount_kes: number; mpesa_code?: string | null; screenshot_url?: string | null }) {
  const userId = await requireUserId();
  const { error } = await supabase.from('deposit_requests').insert({
    merchant_id: userId,
    amount_kes: payload.amount_kes,
    mpesa_code: payload.mpesa_code,
    screenshot_url: payload.screenshot_url,
    status: 'pending',
  });
  if (error) {
    throw new Error(error.message);
  }
  return { status: 'submitted' };
}


export async function submitMerchantAffiliateSaleFallback(payload: {
  product_id: string;
  affiliate_code: string;
  sale_amount_kes: number;
  quantity: number;
  customer_reference: string;
  notes?: string | null;
}) {
  const userId = await requireUserId();
  const affiliateCode = payload.affiliate_code.trim().toUpperCase();
  const customerReference = payload.customer_reference.trim();
  const quantity = Math.max(1, Math.trunc(Number(payload.quantity || 1)));
  const unitSaleAmount = toNumber(payload.sale_amount_kes);

  if (!payload.product_id) throw new Error('Product selection mismatch.');
  if (!affiliateCode) throw new Error('Enter an affiliate or promo code.');
  if (unitSaleAmount <= 0) throw new Error('Enter a valid sale amount.');
  if (!customerReference) throw new Error('Enter a customer or order reference.');

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', payload.product_id)
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
    .eq('product_id', payload.product_id)
    .single();
  if (linkError || !link) {
    throw new Error('Affiliate code not found for this product.');
  }
  if (link.status !== 'active') {
    throw new Error('This affiliate code is not active.');
  }

  const { data: affiliate, error: affiliateError } = await supabase
    .from('profiles')
    .select('id, full_name, business_name, role, affiliate_verification_status, active_plan_code, plan_status')
    .eq('id', link.affiliate_id)
    .eq('role', 'affiliate')
    .single();
  if (affiliateError || !affiliate) {
    throw new Error('Affiliate profile not found.');
  }
  if (affiliate.affiliate_verification_status !== 'verified') {
    throw new Error('The affiliate tied to this code is not verified yet.');
  }
  const affiliatePlanCode = affiliate.active_plan_code || 'affiliate_starter';
  const affiliatePlanStatus = affiliate.plan_status || 'active';
  if (!affiliatePlanCode || affiliatePlanStatus !== 'active') {
    throw new Error('The affiliate tied to this code does not have an active package.');
  }

  const { data: duplicateRows, error: duplicateError } = await supabase
    .from('conversions')
    .select('id')
    .eq('merchant_id', userId)
    .eq('product_id', payload.product_id)
    .eq('customer_reference', customerReference)
    .limit(1);
  if (duplicateError) {
    throw new Error(duplicateError.message);
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

  const orderValue = Number((unitSaleAmount * quantity).toFixed(2));
  const commissionPercent = toNumber(product.commission_percent);
  const commission = Number(((orderValue * commissionPercent) / 100).toFixed(2));
  const platformFee = Number((commission * 0.1).toFixed(2));
  const balance = toNumber(escrow.balance_kes);
  const reservedBalance = toNumber(escrow.reserved_balance_kes);

  if (balance < commission) {
    throw new Error('Your available escrow balance is too low for this commission.');
  }

  const { error: escrowUpdateError } = await supabase
    .from('merchant_escrow')
    .update({
      balance_kes: balance - commission,
      reserved_balance_kes: reservedBalance + commission,
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrow.id)
    .eq('merchant_id', userId);
  if (escrowUpdateError) {
    throw new Error(escrowUpdateError.message);
  }

  const { data: conversionRows, error: conversionError } = await supabase
    .from('conversions')
    .insert({
      link_id: link.id,
      affiliate_id: affiliate.id,
      merchant_id: userId,
      product_id: payload.product_id,
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
    })
    .select('*')
    .limit(1);

  if (conversionError) {
    await supabase
      .from('merchant_escrow')
      .update({
        balance_kes: balance,
        reserved_balance_kes: reservedBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', escrow.id)
      .eq('merchant_id', userId);

    if ((conversionError as any).code === '23505') {
      throw new Error('This customer or order reference has already been submitted.');
    }
    throw new Error(conversionError.message);
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

export async function listReceiptsFallback() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('official_receipts')
    .select('*')
    .eq('recipient_id', userId)
    .order('generated_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return { items: data || [] };
}

export async function getReceiptFallback(receiptId: string) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('official_receipts')
    .select('*')
    .eq('id', receiptId)
    .eq('recipient_id', userId)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function generateAffiliateLinkFallback(productId: string) {
  const userId = await requireUserId();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('affiliate_verification_status, active_plan_code, plan_status')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('Please sign in again.');
  }
  if (profile.affiliate_verification_status !== 'verified') {
    throw new Error('Complete affiliate verification before generating links.');
  }
  const effectivePlanCode = profile.active_plan_code || 'affiliate_starter';
  const effectivePlanStatus = profile.plan_status || 'active';
  if (!effectivePlanCode || effectivePlanStatus !== 'active') {
    throw new Error('Activate an affiliate package in Settings before generating links.');
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('is_active', true)
    .eq('moderation_status', 'approved')
    .single();

  if (productError || !product) {
    throw new Error('Product not available for promotion.');
  }

  const code = `${userId.slice(0, 4)}-${Math.random().toString(16).slice(2, 8)}`.toUpperCase();
  const destinationUrl = buildPublicProductLink(productId, code);
  const { error } = await supabase.from('affiliate_links').insert({
    affiliate_id: userId,
    product_id: productId,
    unique_code: code,
    link_type: 'smart_link',
    destination_url: destinationUrl,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { code, destination_url: destinationUrl };
}


export async function listAffiliateLinksFallback() {
  const userId = await requireUserId();
  const { data: links, error } = await supabase
    .from('affiliate_links')
    .select('id, product_id, unique_code, destination_url, clicks, conversions, total_earned_kes, status, created_at')
    .eq('affiliate_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const productIds = Array.from(new Set((links || []).map((row) => row.product_id).filter(Boolean)));
  let productMap = new Map<string, { title?: string | null }>();
  if (productIds.length > 0) {
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, title')
      .in('id', productIds as string[]);
    if (productError) {
      throw new Error(productError.message);
    }
    productMap = new Map((products || []).map((product) => [product.id, product]));
  }

  return {
    items: (links || []).map((link) => ({
      ...link,
      destination_url: link.destination_url || buildPublicProductLink(link.product_id, link.unique_code),
      products: link.product_id ? productMap.get(link.product_id) || null : null,
    })),
  };
}

export async function mutateAffiliateLinkFallback(linkId: string, action: 'pause' | 'resume' | 'archive' | 'delete') {
  const userId = await requireUserId();
  const { data: existing, error: existingError } = await supabase
    .from('affiliate_links')
    .select('id, clicks, conversions, total_earned_kes')
    .eq('id', linkId)
    .eq('affiliate_id', userId)
    .single();

  if (existingError || !existing) {
    throw new Error(existingError?.message || 'Link not found.');
  }

  if (action === 'delete') {
    const hasActivity = toNumber(existing.clicks) > 0 || toNumber(existing.conversions) > 0 || toNumber(existing.total_earned_kes) > 0;
    if (hasActivity) {
      const { error: archiveError } = await supabase
        .from('affiliate_links')
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', linkId)
        .eq('affiliate_id', userId);
      if (archiveError) throw new Error(archiveError.message);
      return { status: 'archived' };
    }

    const { error: deleteError } = await supabase.from('affiliate_links').delete().eq('id', linkId).eq('affiliate_id', userId);
    if (deleteError) throw new Error(deleteError.message);
    return { status: 'deleted' };
  }

  const payload =
    action === 'pause'
      ? { status: 'paused' }
      : action === 'resume'
        ? { status: 'active', archived_at: null }
        : { status: 'archived', archived_at: new Date().toISOString() };

  const { error: updateError } = await supabase.from('affiliate_links').update(payload).eq('id', linkId).eq('affiliate_id', userId);
  if (updateError) {
    throw new Error(updateError.message);
  }
  return { status: payload.status };
}
