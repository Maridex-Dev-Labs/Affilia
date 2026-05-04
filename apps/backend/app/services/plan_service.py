from datetime import datetime, timedelta, timezone

from app.db.supabase import insert, select, update
from app.utils.helpers import utcnow_iso


def activate_profile_plan(profile_id: str, approver_id: str, notes: str | None = None) -> dict:
    rows = select(
        'profile_plan_selections',
        params={'profile_id': f'eq.{profile_id}', 'status': 'eq.pending_verification', 'select': '*', 'limit': 1},
    )
    if not rows:
        rows = select(
            'profile_plan_selections',
            params={'profile_id': f'eq.{profile_id}', 'status': 'eq.active', 'select': '*', 'limit': 1},
        )
        return rows[0] if rows else {}

    plan = rows[0]
    now = utcnow_iso()
    expires_at = plan.get('expires_at')
    if not expires_at:
        # Month-to-month packages expire 30 days after activation.
        expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    updated_rows = update(
        'profile_plan_selections',
        {
            'status': 'active',
            'verified_by': approver_id,
            'verification_notes': notes,
            'activated_at': now,
            'expires_at': expires_at,
        },
        {'profile_id': f'eq.{profile_id}'},
    )
    active_plan = updated_rows[0] if updated_rows else plan

    update(
        'profiles',
        {
            'active_plan_code': active_plan.get('plan_code'),
            'active_plan_role': active_plan.get('role'),
            'plan_status': 'active',
            'plan_activated_at': now,
        },
        {'id': f'eq.{profile_id}'},
    )

    if active_plan.get('role') == 'affiliate':
        access_level = 'premium' if active_plan.get('plan_code') == 'affiliate_growth' else 'free'
        membership = select('academy_memberships', params={'user_id': f'eq.{profile_id}', 'select': '*', 'limit': 1})
        payload = {
            'user_id': profile_id,
            'access_level': access_level,
            'source': 'billing_plan',
            'notes': notes,
        }
        if membership:
            update('academy_memberships', payload, {'user_id': f'eq.{profile_id}'})
        else:
            insert('academy_memberships', payload)

    return active_plan


def reject_profile_plan(profile_id: str, approver_id: str, notes: str | None = None) -> dict:
    rows = update(
        'profile_plan_selections',
        {
            'status': 'cancelled',
            'verified_by': approver_id,
            'verification_notes': notes,
        },
        {'profile_id': f'eq.{profile_id}', 'status': 'eq.pending_verification'},
    )
    return rows[0] if rows else {}



def revoke_profile_plan(profile_id: str, approver_id: str, notes: str | None = None) -> dict:
    rows = select(
        'profile_plan_selections',
        params={'profile_id': f'eq.{profile_id}', 'status': 'eq.active', 'select': '*', 'limit': 1},
    )
    if not rows:
        return {}

    active_plan = rows[0]
    now = utcnow_iso()
    updated_rows = update(
        'profile_plan_selections',
        {
            'status': 'cancelled',
            'verified_by': approver_id,
            'verification_notes': notes,
            'expires_at': now,
        },
        {'profile_id': f'eq.{profile_id}', 'status': 'eq.active'},
    )
    cancelled_plan = updated_rows[0] if updated_rows else active_plan

    role = active_plan.get('role')
    fallback_plan_code = 'affiliate_starter' if role == 'affiliate' else 'merchant_free' if role == 'merchant' else None
    profile_payload = {
        'active_plan_code': fallback_plan_code,
        'active_plan_role': role if fallback_plan_code else None,
        'plan_status': 'active' if fallback_plan_code else None,
        'plan_activated_at': now if fallback_plan_code else None,
    }
    update('profiles', profile_payload, {'id': f'eq.{profile_id}'})

    if role == 'affiliate':
        membership = select('academy_memberships', params={'user_id': f'eq.{profile_id}', 'select': '*', 'limit': 1})
        payload = {
            'user_id': profile_id,
            'access_level': 'free',
            'source': 'billing_plan',
            'notes': notes,
        }
        if membership:
            update('academy_memberships', payload, {'user_id': f'eq.{profile_id}'})
        else:
            insert('academy_memberships', payload)

    return cancelled_plan



def reactivate_profile_plan(profile_id: str, approver_id: str, notes: str | None = None) -> dict:
    rows = select(
        'profile_plan_selections',
        params={
            'profile_id': f'eq.{profile_id}',
            'status': 'in.(cancelled,expired)',
            'select': '*',
            'order': 'updated_at.desc',
            'limit': 1,
        },
    )
    if not rows:
        return {}

    plan = rows[0]
    now = utcnow_iso()
    expires_at = plan.get('expires_at')
    if not expires_at:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    updated_rows = update(
        'profile_plan_selections',
        {
            'status': 'active',
            'verified_by': approver_id,
            'verification_notes': notes,
            'activated_at': now,
            'expires_at': expires_at,
        },
        {'profile_id': f'eq.{profile_id}', 'plan_code': f'eq.{plan.get("plan_code")}'},
    )
    active_plan = updated_rows[0] if updated_rows else plan

    update(
        'profiles',
        {
            'active_plan_code': active_plan.get('plan_code'),
            'active_plan_role': active_plan.get('role'),
            'plan_status': 'active',
            'plan_activated_at': now,
        },
        {'id': f'eq.{profile_id}'},
    )

    if active_plan.get('role') == 'affiliate':
        access_level = 'premium' if active_plan.get('plan_code') == 'affiliate_growth' else 'free'
        membership = select('academy_memberships', params={'user_id': f'eq.{profile_id}', 'select': '*', 'limit': 1})
        payload = {
            'user_id': profile_id,
            'access_level': access_level,
            'source': 'billing_plan',
            'notes': notes,
        }
        if membership:
            update('academy_memberships', payload, {'user_id': f'eq.{profile_id}'})
        else:
            insert('academy_memberships', payload)

    return active_plan
