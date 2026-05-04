from fastapi import HTTPException, status

from app.db.supabase import select


def default_free_plan(role: str) -> dict | None:
    if role == 'affiliate':
        return {'plan_code': 'affiliate_starter', 'status': 'active', 'role': role, 'source': 'implicit_free'}
    if role == 'merchant':
        return {'plan_code': 'merchant_free', 'status': 'active', 'role': role, 'source': 'implicit_free'}
    return None


def get_active_plan(profile_id: str, role: str | None = None) -> dict | None:
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
