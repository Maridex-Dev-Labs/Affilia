import hashlib
from datetime import datetime, timezone

from app.db.supabase import insert, select


def list_receipts_for_user(user_id: str):
    return select('official_receipts', {'recipient_id': f'eq.{user_id}', 'select': '*', 'order': 'generated_at.desc'})


def get_receipt_by_id(receipt_id: str):
    rows = select('official_receipts', {'id': f'eq.{receipt_id}', 'select': '*', 'limit': 1})
    return rows[0] if rows else None


def _receipt_prefix(receipt_type: str) -> str:
    return {
        'deposit': 'DEP',
        'payout': 'PAY',
        'sweep_batch': 'SWP',
    }.get(receipt_type, 'RCT')


def create_official_receipt(*, receipt_type: str, recipient_id: str, amount_kes: float, generated_by: str | None = None, mpesa_reference: str | None = None, pdf_url: str | None = None):
    if mpesa_reference:
        existing = select(
            'official_receipts',
            {
                'receipt_type': f'eq.{receipt_type}',
                'recipient_id': f'eq.{recipient_id}',
                'mpesa_reference': f'eq.{mpesa_reference}',
                'select': '*',
                'limit': 1,
            },
        )
        if existing:
            return existing[0]

    timestamp = datetime.now(timezone.utc)
    raw = f"{receipt_type}:{recipient_id}:{amount_kes:.2f}:{timestamp.isoformat()}:{mpesa_reference or ''}"
    verification_hash = hashlib.sha256(raw.encode('utf-8')).hexdigest()
    receipt_number = f"{_receipt_prefix(receipt_type)}-{timestamp.strftime('%Y%m%d%H%M%S')}-{verification_hash[:6].upper()}"
    created = insert(
        'official_receipts',
        {
            'receipt_number': receipt_number,
            'receipt_type': receipt_type,
            'recipient_id': recipient_id,
            'amount_kes': round(float(amount_kes or 0), 2),
            'mpesa_reference': mpesa_reference,
            'pdf_url': pdf_url,
            'verification_hash': verification_hash,
            'generated_by': generated_by,
            'generated_at': timestamp.isoformat(),
        },
    )
    return created[0] if isinstance(created, list) and created else created
