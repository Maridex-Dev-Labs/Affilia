from app.db.crud.base import list_rows


def list_user_receipts(user_id: str):
    return list_rows('official_receipts', {'recipient_id': f'eq.{user_id}', 'select': '*', 'order': 'generated_at.desc'})


def list_user_payouts(user_id: str):
    return list_rows('payouts', {'affiliate_id': f'eq.{user_id}', 'select': '*', 'order': 'created_at.desc'})
