import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user, require_role
from app.config import settings
from app.db.supabase import delete as delete_rows
from app.db.supabase import insert, rpc, select, update
from app.services.access_service import ensure_affiliate_operational_access
from app.utils.helpers import utcnow_iso

router = APIRouter()


class LinkPayload(BaseModel):
    product_id: str


class AffiliateVerificationPayload(BaseModel):
    national_id_number: str


def _normalize_identifier(value: str) -> str:
    return ''.join(ch for ch in (value or '').upper().strip() if ch.isalnum())


def _to_number(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


@router.get('/dashboard')
def dashboard(user=Depends(get_current_user)):
    profile = require_role(user['id'], 'affiliate')
    affiliate_id = profile['id']

    links = select('affiliate_links', params={'affiliate_id': f'eq.{affiliate_id}', 'select': 'id,clicks,status,created_at'})
    conversions = select(
        'conversions',
        params={'affiliate_id': f'eq.{affiliate_id}', 'select': 'commission_earned_kes,created_at'},
    )

    total = sum(_to_number(row.get('commission_earned_kes')) for row in conversions)
    clicks = sum(int(row.get('clicks') or 0) for row in links)

    today_conversions = select(
        'conversions',
        params={
            'affiliate_id': f'eq.{affiliate_id}',
            'created_at': f'gte.{__import__("datetime").datetime.utcnow().date().isoformat()}T00:00:00',
            'select': 'commission_earned_kes',
        },
    )
    today_total = sum(_to_number(row.get('commission_earned_kes')) for row in today_conversions)

    leaderboard = rpc('get_leaderboard', {'limit_count': 50})
    user_rank = None
    for index, row in enumerate(leaderboard or [], start=1):
      if row.get('affiliate_id') == affiliate_id:
        user_rank = index
        break

    return {
        'today': today_total,
        'total': total,
        'links': sum(1 for row in links if row.get('status', 'active') == 'active'),
        'clicks': clicks,
        'rank': user_rank,
        'leaderboard_total': len(leaderboard or []),
    }


@router.get('/marketplace')
def marketplace(user=Depends(get_current_user)):
    require_role(user['id'], 'affiliate')
    items = select('products', params={'is_active': 'eq.true', 'moderation_status': 'eq.approved', 'select': '*'})
    return {'items': items}


@router.get('/links')
def list_links(user=Depends(get_current_user)):
    profile = require_role(user['id'], 'affiliate')
    items = select(
        'affiliate_links',
        params={
            'affiliate_id': f'eq.{profile["id"]}',
            'select': 'id,unique_code,clicks,conversions,total_earned_kes,status,created_at,products(title)',
            'order': 'created_at.desc',
        },
    )
    return {'items': items}


@router.post('/verification/submit')
def submit_verification(payload: AffiliateVerificationPayload, user=Depends(get_current_user)):
    profile = require_role(user['id'], 'affiliate')
    national_id = _normalize_identifier(payload.national_id_number)
    if len(national_id) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Enter a valid national ID number.')
    if not profile.get('phone_number'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Add your primary phone number before submitting verification.')
    if not profile.get('payout_phone'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Add your payout phone number before submitting verification.')

    duplicate_reasons: list[str] = []
    checks = [
        ('national_id_number', national_id, 'Another affiliate already uses this national ID number.'),
        ('phone_number', profile.get('phone_number'), 'Another affiliate already uses this phone number.'),
        ('payout_phone', profile.get('payout_phone'), 'Another affiliate already uses this payout phone number.'),
    ]
    for field_name, field_value, reason in checks:
        if not field_value:
            continue
        matches = select(
            'profiles',
            params={
                'role': 'eq.affiliate',
                'id': f'neq.{profile["id"]}',
                field_name: f'eq.{field_value}',
                'select': 'id',
                'limit': 1,
            },
        )
        if matches:
            duplicate_reasons.append(reason)

    if duplicate_reasons:
        update(
            'profiles',
            {
                'national_id_number': national_id,
                'affiliate_verification_status': 'restricted_duplicate',
                'duplicate_flag_reason': ' '.join(duplicate_reasons),
                'affiliate_verification_notes': 'Duplicate-risk checks failed during submission.',
            },
            {'id': f'eq.{profile["id"]}'},
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='This affiliate account has been flagged for duplicate-risk review. Contact support or wait for admin review.',
        )

    updated_rows = update(
        'profiles',
        {
            'national_id_number': national_id,
            'affiliate_verification_status': 'under_review',
            'duplicate_flag_reason': None,
            'affiliate_verification_notes': 'Verification submitted and awaiting admin review.',
        },
        {'id': f'eq.{profile["id"]}'},
    )
    return {'status': 'under_review', 'profile': updated_rows[0] if updated_rows else None}


@router.post('/generate-link')
def generate_link(payload: LinkPayload, user=Depends(get_current_user)):
    profile = require_role(user['id'], 'affiliate')
    ensure_affiliate_operational_access(profile)
    products = select(
        'products',
        params={
            'id': f'eq.{payload.product_id}',
            'is_active': 'eq.true',
            'moderation_status': 'eq.approved',
            'limit': 1,
        },
    )
    if not products:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Product not available for promotion.')

    code = f"{profile['id'][:4]}-{secrets.token_hex(3)}".upper()
    insert(
        'affiliate_links',
        {
            'affiliate_id': profile['id'],
            'product_id': payload.product_id,
            'unique_code': code,
            'link_type': 'smart_link',
            'destination_url': f"{settings.APP_URL}/r/{code}",
        },
    )
    return {'code': code, 'destination_url': f"{settings.APP_URL}/r/{code}"}


@router.post('/links/{link_id}/pause')
def pause_link(link_id: str, user=Depends(get_current_user)):
    profile = require_role(user['id'], 'affiliate')
    rows = update('affiliate_links', {'status': 'paused'}, {'id': f'eq.{link_id}', 'affiliate_id': f'eq.{profile["id"]}'})
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Link not found.')
    return {'status': 'paused', 'link': rows[0]}


@router.post('/links/{link_id}/resume')
def resume_link(link_id: str, user=Depends(get_current_user)):
    profile = require_role(user['id'], 'affiliate')
    ensure_affiliate_operational_access(profile)
    rows = update(
        'affiliate_links',
        {'status': 'active', 'archived_at': None},
        {'id': f'eq.{link_id}', 'affiliate_id': f'eq.{profile["id"]}'},
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Link not found.')
    return {'status': 'active', 'link': rows[0]}


@router.post('/links/{link_id}/archive')
def archive_link(link_id: str, user=Depends(get_current_user)):
    profile = require_role(user['id'], 'affiliate')
    rows = update(
        'affiliate_links',
        {'status': 'archived', 'archived_at': utcnow_iso()},
        {'id': f'eq.{link_id}', 'affiliate_id': f'eq.{profile["id"]}'},
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Link not found.')
    return {'status': 'archived', 'link': rows[0]}


@router.delete('/links/{link_id}')
def delete_link(link_id: str, user=Depends(get_current_user)):
    profile = require_role(user['id'], 'affiliate')
    links = select(
        'affiliate_links',
        params={'id': f'eq.{link_id}', 'affiliate_id': f'eq.{profile["id"]}', 'select': '*', 'limit': 1},
    )
    if not links:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Link not found.')

    link = links[0]
    has_activity = int(link.get('clicks') or 0) > 0 or int(link.get('conversions') or 0) > 0 or _to_number(link.get('total_earned_kes')) > 0
    if has_activity:
        archived_rows = update(
            'affiliate_links',
            {'status': 'archived', 'archived_at': utcnow_iso()},
            {'id': f'eq.{link_id}', 'affiliate_id': f'eq.{profile["id"]}'},
        )
        return {'status': 'archived', 'link': archived_rows[0] if archived_rows else link, 'reason': 'Link activity was preserved for audit and analytics.'}

    delete_rows('affiliate_links', {'id': f'eq.{link_id}', 'affiliate_id': f'eq.{profile["id"]}'})
    return {'status': 'deleted', 'link_id': link_id}


@router.get('/leaderboard')
def leaderboard(user=Depends(get_current_user)):
    profile = require_role(user['id'], 'affiliate')
    rows = rpc('get_leaderboard', {'limit_count': 50}) or []
    affiliate_ids = [row.get('affiliate_id') for row in rows if row.get('affiliate_id')]
    profile_map = {}
    if affiliate_ids:
        profiles = select('profiles', params={'id': f'in.({",".join(affiliate_ids)})', 'select': 'id,full_name,business_name'})
        profile_map = {entry['id']: entry for entry in profiles}

    formatted = []
    user_rank = None
    for index, row in enumerate(rows, start=1):
        affiliate_id = row.get('affiliate_id')
        if affiliate_id == profile['id']:
            user_rank = index
        name_source = profile_map.get(affiliate_id, {})
        formatted.append(
            {
                'id': affiliate_id,
                'rank': index,
                'total': _to_number(row.get('total')),
                'name': name_source.get('full_name') or name_source.get('business_name') or affiliate_id,
            }
        )

    return {'rows': formatted, 'user_rank': user_rank, 'total': len(formatted)}
