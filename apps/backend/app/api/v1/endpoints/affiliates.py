import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user, require_role
from app.config import settings
from app.db.supabase import insert, rpc, select

router = APIRouter()


class LinkPayload(BaseModel):
    product_id: str


def _to_number(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


@router.get('/dashboard')
def dashboard(user=Depends(get_current_user)):
    profile = require_role(user['id'], 'affiliate')
    affiliate_id = profile['id']

    links = select('affiliate_links', params={'affiliate_id': f'eq.{affiliate_id}', 'select': 'id,clicks,created_at'})
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
        'links': len(links),
        'clicks': clicks,
        'rank': user_rank,
        'leaderboard_total': len(leaderboard or []),
    }


@router.get('/marketplace')
def marketplace(user=Depends(get_current_user)):
    require_role(user['id'], 'affiliate')
    items = select('products', params={'is_active': 'eq.true', 'moderation_status': 'eq.approved', 'select': '*'})
    return {'items': items}


@router.post('/generate-link')
def generate_link(payload: LinkPayload, user=Depends(get_current_user)):
    profile = require_role(user['id'], 'affiliate')
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
