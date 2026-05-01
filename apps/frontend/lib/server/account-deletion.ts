import 'server-only';

import { createServiceRoleClient } from './supabase-service';

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function deleteAccountForUser(userId: string, confirmationText: string) {
  if (confirmationText.trim().toUpperCase() !== 'DELETE') {
    throw new Error('Type DELETE to confirm account deletion.');
  }

  const supabase = createServiceRoleClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error(profileError?.message || 'Profile not found.');
  }

  const blockers: string[] = [];

  if (profile.role === 'merchant') {
    const { data: escrowRows } = await supabase
      .from('merchant_escrow')
      .select('balance_kes')
      .eq('merchant_id', userId)
      .limit(1);
    const escrowBalance = toNumber(escrowRows?.[0]?.balance_kes);
    if (escrowBalance > 0) {
      blockers.push(`Merchant escrow still holds KES ${escrowBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Withdraw or reconcile it first.`);
    }

    const { data: pendingDeposits } = await supabase
      .from('deposit_requests')
      .select('id')
      .eq('merchant_id', userId)
      .eq('status', 'pending')
      .limit(1);
    if (pendingDeposits?.length) blockers.push('There is at least one pending deposit request awaiting review.');

    const { data: pendingConversions } = await supabase
      .from('conversions')
      .select('id')
      .eq('merchant_id', userId)
      .in('status', ['pending', 'approved'])
      .limit(1);
    if (pendingConversions?.length) blockers.push('There are unsettled merchant conversions tied to this account.');
  }

  if (profile.role === 'affiliate') {
    const { data: pendingPayouts } = await supabase
      .from('payouts')
      .select('id')
      .eq('affiliate_id', userId)
      .eq('status', 'pending')
      .limit(1);
    if (pendingPayouts?.length) blockers.push('There is a pending payout scheduled for this affiliate account.');

    const { data: unsettledConversions } = await supabase
      .from('conversions')
      .select('id')
      .eq('affiliate_id', userId)
      .in('status', ['pending', 'approved'])
      .limit(1);
    if (unsettledConversions?.length) blockers.push('There are unsettled commissions still linked to this affiliate account.');
  }

  if (blockers.length > 0) {
    throw new Error(blockers.join(' '));
  }

  await supabase.from('admin_audit_log').insert({
    action_type: 'account_deleted_by_owner',
    target_type: 'profile',
    target_id: userId,
    previous_state: {
      role: profile.role,
      business_name: profile.business_name,
      full_name: profile.full_name,
    },
    new_state: { status: 'deleted' },
  });

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return { status: 'deleted' };
}
