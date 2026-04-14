from app.db.crud.base import get_row, list_rows


def get_receipt(receipt_id: str):
    return get_row('official_receipts', {'id': f'eq.{receipt_id}', 'select': '*'})


def list_receipts(params: dict | None = None):
    return list_rows('official_receipts', params or {'select': '*', 'order': 'generated_at.desc'})
