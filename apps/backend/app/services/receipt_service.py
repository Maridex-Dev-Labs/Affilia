from app.db.supabase import select


def list_receipts_for_user(user_id: str):
    return select('official_receipts', {'recipient_id': f'eq.{user_id}', 'select': '*', 'order': 'generated_at.desc'})


def get_receipt_by_id(receipt_id: str):
    rows = select('official_receipts', {'id': f'eq.{receipt_id}', 'select': '*', 'limit': 1})
    return rows[0] if rows else None
