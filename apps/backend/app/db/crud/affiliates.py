from app.db.crud.base import list_rows


def list_affiliate_links(affiliate_id: str):
    return list_rows('affiliate_links', {'affiliate_id': f'eq.{affiliate_id}', 'select': '*'})


def list_affiliate_conversions(affiliate_id: str):
    return list_rows('conversions', {'affiliate_id': f'eq.{affiliate_id}', 'select': '*'})
