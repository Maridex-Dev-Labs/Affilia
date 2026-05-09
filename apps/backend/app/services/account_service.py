from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.db.supabase import auth_admin_delete_user, insert, select, update
from app.services.plan_service import revoke_profile_plan
from app.utils.helpers import utcnow_iso

DELETE_GRACE_DAYS = 7


def _to_number(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def account_control_from_profile(profile: dict | None) -> dict:
    documents = dict((profile or {}).get('documents') or {})
    control = dict(documents.get('account_control') or {})
    control.setdefault('status', 'active')
    return control


def upsert_account_control(profile: dict, control: dict) -> dict:
    documents = dict(profile.get('documents') or {})
    documents['account_control'] = control
    rows = update('profiles', {'documents': documents}, {'id': f'eq.{profile["id"]}'})
    updated = rows[0] if rows else {**profile, 'documents': documents}
    return updated


def merchant_delete_blockers(user_id: str) -> list[str]:
    blockers: list[str] = []
    escrow_rows = select('merchant_escrow', params={'merchant_id': f'eq.{user_id}', 'limit': 1})
    escrow_balance = _to_number(escrow_rows[0].get('balance_kes')) if escrow_rows else 0.0
    if escrow_balance > 0:
        blockers.append(f'Merchant escrow still holds KES {escrow_balance:,.2f}. Withdraw or reconcile it first.')

    pending_deposits = select(
        'deposit_requests',
        params={'merchant_id': f'eq.{user_id}', 'status': 'eq.pending', 'select': 'id', 'limit': 1},
    )
    if pending_deposits:
        blockers.append('There is at least one pending deposit request awaiting review.')

    pending_conversions = select(
        'conversions',
        params={
            'merchant_id': f'eq.{user_id}',
            'status': 'in.(pending,approved)',
            'select': 'id',
            'limit': 1,
        },
    )
    if pending_conversions:
        blockers.append('There are unsettled merchant conversions tied to this account.')

    return blockers


def affiliate_delete_blockers(user_id: str) -> list[str]:
    blockers: list[str] = []
    pending_payouts = select(
        'payouts',
        params={'affiliate_id': f'eq.{user_id}', 'status': 'eq.pending', 'select': 'id', 'limit': 1},
    )
    if pending_payouts:
        blockers.append('There is a pending payout scheduled for this affiliate account.')

    unsettled_conversions = select(
        'conversions',
        params={
            'affiliate_id': f'eq.{user_id}',
            'status': 'in.(pending,approved)',
            'select': 'id',
            'limit': 1,
        },
    )
    if unsettled_conversions:
        blockers.append('There are unsettled commissions still linked to this affiliate account.')

    return blockers


def delete_blockers_for_profile(profile: dict) -> list[str]:
    if profile.get('role') == 'merchant':
        return merchant_delete_blockers(profile['id'])
    if profile.get('role') == 'affiliate':
        return affiliate_delete_blockers(profile['id'])
    return []


def account_deletion_status(profile: dict) -> dict:
    control = account_control_from_profile(profile)
    blockers = delete_blockers_for_profile(profile)
    return {
        'status': control.get('status', 'active'),
        'scheduled_for': control.get('scheduled_for'),
        'reason': control.get('reason'),
        'warning_message': control.get('warning_message'),
        'block_reason': control.get('block_reason'),
        'immediate_allowed': len(blockers) == 0,
        'blockers': blockers,
        'grace_days': DELETE_GRACE_DAYS,
    }


def _write_audit(action_type: str, target_id: str, previous_state: dict | None = None, new_state: dict | None = None, actor_id: str | None = None):
    insert(
        'admin_audit_log',
        {
            'admin_user_id': actor_id,
            'action_type': action_type,
            'target_type': 'profile',
            'target_id': target_id,
            'previous_state': previous_state or {},
            'new_state': new_state or {},
        },
    )


def schedule_account_deletion(profile: dict, actor_id: str, *, actor_type: str, reason: str | None = None) -> dict:
    now = datetime.now(timezone.utc)
    scheduled_for = (now + timedelta(days=DELETE_GRACE_DAYS)).isoformat()
    control = account_control_from_profile(profile)
    previous_status = control.get('status', 'active')
    control.update({
        'status': 'scheduled_for_deletion',
        'scheduled_for': scheduled_for,
        'requested_at': now.isoformat(),
        'requested_by': actor_id,
        'requested_by_type': actor_type,
        'reason': reason,
    })
    updated = upsert_account_control(profile, control)
    _write_audit(
        'account_deletion_scheduled',
        profile['id'],
        previous_state={'status': previous_status},
        new_state={'status': 'scheduled_for_deletion', 'scheduled_for': scheduled_for, 'reason': reason},
        actor_id=actor_id,
    )
    return account_deletion_status(updated)


def cancel_account_deletion(profile: dict, actor_id: str, *, actor_type: str) -> dict:
    control = account_control_from_profile(profile)
    previous_status = control.get('status', 'active')
    warning_message = control.get('warning_message')
    block_reason = control.get('block_reason')
    next_status = 'blocked' if block_reason else 'warned' if warning_message else 'active'
    control.update({
        'status': next_status,
        'scheduled_for': None,
        'requested_at': None,
        'requested_by': None,
        'requested_by_type': None,
        'reason': None,
    })
    updated = upsert_account_control(profile, control)
    _write_audit(
        'account_deletion_cancelled',
        profile['id'],
        previous_state={'status': previous_status},
        new_state={'status': next_status},
        actor_id=actor_id,
    )
    return account_deletion_status(updated)


def delete_account_now(profile: dict, actor_id: str, *, actor_type: str, reason: str | None = None) -> dict:
    blockers = delete_blockers_for_profile(profile)
    if blockers:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=' '.join(blockers))

    _write_audit(
        'account_deleted_by_owner' if actor_type == 'owner' else 'account_deleted_by_admin',
        profile['id'],
        previous_state={
            'role': profile.get('role'),
            'business_name': profile.get('business_name'),
            'full_name': profile.get('full_name'),
        },
        new_state={'status': 'deleted', 'reason': reason},
        actor_id=actor_id,
    )
    auth_admin_delete_user(profile['id'])
    return {'status': 'deleted'}


def warn_account(profile: dict, actor_id: str, message: str) -> dict:
    control = account_control_from_profile(profile)
    previous_status = control.get('status', 'active')
    control.update({
        'status': 'warned',
        'warning_message': message,
        'warned_at': utcnow_iso(),
        'warned_by': actor_id,
    })
    updated = upsert_account_control(profile, control)
    _write_audit(
        'account_warned',
        profile['id'],
        previous_state={'status': previous_status},
        new_state={'status': 'warned', 'warning_message': message},
        actor_id=actor_id,
    )
    return account_deletion_status(updated)


def block_account(profile: dict, actor_id: str, reason: str) -> dict:
    control = account_control_from_profile(profile)
    previous_status = control.get('status', 'active')
    control.update({
        'status': 'blocked',
        'block_reason': reason,
        'blocked_at': utcnow_iso(),
        'blocked_by': actor_id,
    })
    updated = upsert_account_control(profile, control)
    _write_audit(
        'account_blocked',
        profile['id'],
        previous_state={'status': previous_status},
        new_state={'status': 'blocked', 'block_reason': reason},
        actor_id=actor_id,
    )
    return account_deletion_status(updated)


def restore_account(profile: dict, actor_id: str) -> dict:
    control = account_control_from_profile(profile)
    previous_status = control.get('status', 'active')
    control.update({
        'status': 'active',
        'block_reason': None,
        'scheduled_for': None,
        'requested_at': None,
        'requested_by': None,
        'requested_by_type': None,
        'reason': None,
        'warning_message': None,
    })
    updated = upsert_account_control(profile, control)
    _write_audit(
        'account_restored',
        profile['id'],
        previous_state={'status': previous_status},
        new_state={'status': 'active'},
        actor_id=actor_id,
    )
    return account_deletion_status(updated)


def revoke_user_access(profile: dict, actor_id: str, reason: str) -> dict:
    role = profile.get('role')
    plan = revoke_profile_plan(profile['id'], approver_id=actor_id, notes=reason)
    update_payload: dict = {}

    documents = dict(profile.get('documents') or {})

    if role == 'affiliate':
        verification = dict(documents.get('affiliate_verification') or {})
        verification.update({
            'status': 'revision_requested',
            'notes': reason,
            'reviewed_at': utcnow_iso(),
            'reviewed_by': actor_id,
        })
        documents['affiliate_verification'] = verification
        update_payload.update({
            'affiliate_verification_status': 'revision_requested',
            'affiliate_verification_notes': reason,
            'documents': documents,
        })
    elif role == 'merchant':
        verification = dict(documents.get('merchant_verification') or {})
        verification.update({
            'status': 'revision_requested',
            'notes': reason,
            'reviewed_at': utcnow_iso(),
            'reviewed_by': actor_id,
        })
        documents['merchant_verification'] = verification
        update_payload.update({
            'business_verified': False,
            'documents': documents,
        })

    if update_payload:
        update('profiles', update_payload, {'id': f'eq.{profile["id"]}'})

    _write_audit(
        'account_access_revoked',
        profile['id'],
        previous_state={'role': role, 'plan_code': plan.get('plan_code') if plan else None},
        new_state={'reason': reason},
        actor_id=actor_id,
    )
    refreshed = select('profiles', params={'id': f'eq.{profile["id"]}', 'limit': 1})
    return refreshed[0] if refreshed else profile
