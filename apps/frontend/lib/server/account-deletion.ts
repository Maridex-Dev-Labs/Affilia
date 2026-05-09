import 'server-only';

import { createServiceRoleClient } from './supabase-service';

const DELETE_GRACE_DAYS = 7;

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getAccountControl(documents: Record<string, any> | null | undefined) {
  return {
    status: documents?.account_control?.status || 'active',
    warning_message: documents?.account_control?.warning_message || null,
    block_reason: documents?.account_control?.block_reason || null,
    scheduled_for: documents?.account_control?.scheduled_for || null,
    reason: documents?.account_control?.reason || null,
  };
}

async function getProfileForUser(userId: string) {
  const supabase = createServiceRoleClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error(error?.message || 'Profile not found.');
  }

  return { supabase, profile };
}

async function getDeleteBlockers(supabase: ReturnType<typeof createServiceRoleClient>, profile: any) {
  const blockers: string[] = [];

  if (profile.role === 'merchant') {
    const { data: escrowRows } = await supabase
      .from('merchant_escrow')
      .select('balance_kes')
      .eq('merchant_id', profile.id)
      .limit(1);
    const escrowBalance = toNumber(escrowRows?.[0]?.balance_kes);
    if (escrowBalance > 0) {
      blockers.push(`Merchant escrow still holds KES ${escrowBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Withdraw or reconcile it first.`);
    }

    const { data: pendingDeposits } = await supabase
      .from('deposit_requests')
      .select('id')
      .eq('merchant_id', profile.id)
      .eq('status', 'pending')
      .limit(1);
    if (pendingDeposits?.length) blockers.push('There is at least one pending deposit request awaiting review.');

    const { data: pendingConversions } = await supabase
      .from('conversions')
      .select('id')
      .eq('merchant_id', profile.id)
      .in('status', ['pending', 'approved'])
      .limit(1);
    if (pendingConversions?.length) blockers.push('There are unsettled merchant conversions tied to this account.');
  }

  if (profile.role === 'affiliate') {
    const { data: pendingPayouts } = await supabase
      .from('payouts')
      .select('id')
      .eq('affiliate_id', profile.id)
      .eq('status', 'pending')
      .limit(1);
    if (pendingPayouts?.length) blockers.push('There is a pending payout scheduled for this affiliate account.');

    const { data: unsettledConversions } = await supabase
      .from('conversions')
      .select('id')
      .eq('affiliate_id', profile.id)
      .in('status', ['pending', 'approved'])
      .limit(1);
    if (unsettledConversions?.length) blockers.push('There are unsettled commissions still linked to this affiliate account.');
  }

  return blockers;
}

function buildAccountControl(documents: Record<string, any> | null | undefined, next: Record<string, any>) {
  const copy = { ...(documents || {}) };
  copy.account_control = {
    ...(copy.account_control || {}),
    ...next,
  };
  return copy;
}

export async function getAccountDeletionStatusForUser(userId: string) {
  const { supabase, profile } = await getProfileForUser(userId);
  const blockers = await getDeleteBlockers(supabase, profile);
  const control = getAccountControl(profile.documents);
  return {
    status: control.status,
    scheduled_for: control.scheduled_for,
    reason: control.reason,
    warning_message: control.warning_message,
    block_reason: control.block_reason,
    blockers,
    immediate_allowed: blockers.length === 0,
    grace_days: DELETE_GRACE_DAYS,
  };
}

export async function requestAccountDeletionForUser(userId: string, confirmationText: string, mode: 'scheduled' | 'immediate') {
  if (confirmationText.trim().toUpperCase() !== 'DELETE') {
    throw new Error('Type DELETE to confirm account deletion.');
  }

  const { supabase, profile } = await getProfileForUser(userId);
  const blockers = await getDeleteBlockers(supabase, profile);

  if (mode === 'immediate') {
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
    if (deleteError) throw new Error(deleteError.message);
    return { status: 'deleted' };
  }

  const scheduledFor = new Date(Date.now() + DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const documents = buildAccountControl(profile.documents, {
    status: 'scheduled_for_deletion',
    scheduled_for: scheduledFor,
    requested_at: new Date().toISOString(),
    requested_by: userId,
    requested_by_type: 'owner',
  });
  const { error: updateError } = await supabase.from('profiles').update({ documents }).eq('id', userId);
  if (updateError) throw new Error(updateError.message);

  await supabase.from('admin_audit_log').insert({
    action_type: 'account_deletion_scheduled',
    target_type: 'profile',
    target_id: userId,
    previous_state: { status: getAccountControl(profile.documents).status },
    new_state: { status: 'scheduled_for_deletion', scheduled_for: scheduledFor },
  });

  return {
    status: 'scheduled_for_deletion',
    scheduled_for: scheduledFor,
    blockers,
    immediate_allowed: blockers.length === 0,
    grace_days: DELETE_GRACE_DAYS,
  };
}

export async function cancelAccountDeletionForUser(userId: string) {
  const { supabase, profile } = await getProfileForUser(userId);
  const control = getAccountControl(profile.documents);
  const nextStatus = control.block_reason ? 'blocked' : control.warning_message ? 'warned' : 'active';
  const documents = buildAccountControl(profile.documents, {
    status: nextStatus,
    scheduled_for: null,
    requested_at: null,
    requested_by: null,
    requested_by_type: null,
    reason: null,
  });
  const { error } = await supabase.from('profiles').update({ documents }).eq('id', userId);
  if (error) throw new Error(error.message);

  await supabase.from('admin_audit_log').insert({
    action_type: 'account_deletion_cancelled',
    target_type: 'profile',
    target_id: userId,
    previous_state: { status: control.status },
    new_state: { status: nextStatus },
  });

  const blockers = await getDeleteBlockers(supabase, profile);
  return {
    status: nextStatus,
    scheduled_for: null,
    blockers,
    immediate_allowed: blockers.length === 0,
    grace_days: DELETE_GRACE_DAYS,
  };
}
