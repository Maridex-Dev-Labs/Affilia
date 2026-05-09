from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.db.supabase import select
from app.services.plan_service import expire_profile_plan_if_needed

FREE_AFFILIATE_DAILY_LINK_LIMIT = 5


def default_free_plan(role: str) -> dict | None:
    if role == 'affiliate':
        return {'plan_code': 'affiliate_starter', 'status': 'active', 'role': role, 'source': 'implicit_free'}
    if role == 'merchant':
        return {'plan_code': 'merchant_free', 'status': 'active', 'role': role, 'source': 'implicit_free'}
    return None


def get_active_plan(profile_id: str, role: str | None = None) -> dict | None:
    active_plan = expire_profile_plan_if_needed(profile_id, role=role)
    if active_plan and active_plan.get('status') == 'active':
        return active_plan

    params = {
        'profile_id': f'eq.{profile_id}',
        'status': 'eq.active',
        'select': '*',
        'order': 'activated_at.desc',
        'limit': 1,
    }
    if role:
        params['role'] = f'eq.{role}'
    rows = select('profile_plan_selections', params=params)
    if rows:
        return rows[0]
    return default_free_plan(role) if role else None


def ensure_active_plan(profile_id: str, role: str, detail: str):
    plan = get_active_plan(profile_id, role=role)
    if not plan:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
    return plan


def ensure_affiliate_verified(profile: dict):
    if profile.get('affiliate_verification_status') != 'verified':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Complete affiliate verification before you generate links, earn commissions, or access payout features.',
        )
    return profile


def ensure_affiliate_operational_access(profile: dict):
    ensure_affiliate_verified(profile)
    return ensure_active_plan(
        profile['id'],
        role='affiliate',
        detail='Activate an affiliate package in Settings before you generate links or submit affiliate operations.',
    )


def get_affiliate_link_quota(profile: dict) -> dict:
    plan = ensure_affiliate_operational_access(profile)
    plan_code = plan.get('plan_code')

    if plan_code != 'affiliate_starter':
        return {
            'plan_code': plan_code,
            'daily_limit': None,
            'used_today': 0,
            'remaining_today': None,
            'is_limited': False,
            'window_starts_at': datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat(),
        }

    window_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = select(
        'affiliate_links',
        params={
            'affiliate_id': f'eq.{profile["id"]}',
            'created_at': f'gte.{window_start.isoformat()}',
            'select': 'id',
        },
    )
    used_today = len(rows or [])
    remaining = max(0, FREE_AFFILIATE_DAILY_LINK_LIMIT - used_today)
    return {
        'plan_code': plan_code,
        'daily_limit': FREE_AFFILIATE_DAILY_LINK_LIMIT,
        'used_today': used_today,
        'remaining_today': remaining,
        'is_limited': True,
        'window_starts_at': window_start.isoformat(),
    }


def ensure_affiliate_link_generation_available(profile: dict) -> dict:
    quota = get_affiliate_link_quota(profile)
    if quota['is_limited'] and quota['remaining_today'] <= 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='You have reached today’s free link limit. Try again tomorrow or upgrade for unlimited link generation.',
        )
    return quota
