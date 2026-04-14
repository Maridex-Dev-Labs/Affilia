from app.db.crud.base import create_row, list_rows


def create_affiliate_link(payload: dict):
    return create_row('affiliate_links', payload)


def find_link_by_code(code: str):
    rows = list_rows('affiliate_links', {'unique_code': f'eq.{code}', 'select': '*', 'limit': 1})
    return rows[0] if rows else None
