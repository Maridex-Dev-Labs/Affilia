from app.config import settings
from app.db.supabase import insert, select, update


def _resolved_destination(link: dict) -> str:
    destination = (link.get('destination_url') or '').strip()
    code = link.get('unique_code')
    product_id = link.get('product_id')
    if product_id and (not destination or destination.endswith(f'/r/{code}')):
        return f"{settings.APP_URL}/marketplace/products/{product_id}?ref={code}"
    return destination or settings.APP_URL


def track_click(code: str, payload: dict) -> dict[str, object]:
    links = select('affiliate_links', {'unique_code': f'eq.{code}', 'status': 'eq.active', 'select': '*', 'limit': 1})
    if not links:
        return {'ok': False, 'code': code}
    link = links[0]
    insert('click_events', {
        'link_id': link['id'],
        'visitor_ip': payload.get('ip'),
        'user_agent': payload.get('user_agent') or payload.get('userAgent'),
        'referer': payload.get('referer'),
        'utm_source': payload.get('utm_source'),
        'utm_medium': payload.get('utm_medium'),
        'utm_campaign': payload.get('utm_campaign'),
    })
    update('affiliate_links', {'clicks': int(link.get('clicks') or 0) + 1}, {'id': f"eq.{link['id']}"})
    return {'ok': True, 'code': code, 'link_id': link['id']}


def resolve_destination(code: str) -> str | None:
    links = select('affiliate_links', {'unique_code': f'eq.{code}', 'status': 'eq.active', 'select': '*', 'limit': 1})
    return _resolved_destination(links[0]) if links else None
