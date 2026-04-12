from fastapi import APIRouter
from pydantic import BaseModel
from app.db.supabase import select, insert, update

router = APIRouter()

class ClickPayload(BaseModel):
    code: str
    ip: str | None = None
    userAgent: str | None = None
    referer: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None

@router.post('/click')
def track_click(payload: ClickPayload):
    links = select('affiliate_links', params={'unique_code': f'eq.{payload.code}', 'select': '*', 'limit': 1})
    if not links:
        return {'ok': False}
    link = links[0]
    insert('click_events', {
        'link_id': link['id'],
        'visitor_ip': payload.ip,
        'user_agent': payload.userAgent,
        'referer': payload.referer,
        'utm_source': payload.utm_source,
        'utm_medium': payload.utm_medium,
        'utm_campaign': payload.utm_campaign,
    })
    update('affiliate_links', {'clicks': link.get('clicks', 0) + 1}, params={'id': f"eq.{link['id']}"})
    return {'ok': True, 'code': payload.code}

@router.get('/resolve')
def resolve(code: str):
    links = select('affiliate_links', params={'unique_code': f'eq.{code}', 'select': '*', 'limit': 1})
    if not links:
        return {'destination_url': 'https://affilia.vercel.app'}
    return {'destination_url': links[0].get('destination_url')}
