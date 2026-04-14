from app.db.supabase import insert, select, update
from app.utils.helpers import utcnow_iso


def get_merchant_escrow(merchant_id: str) -> dict:
    rows = select('merchant_escrow', {'merchant_id': f'eq.{merchant_id}', 'select': '*', 'limit': 1})
    return rows[0] if rows else {'merchant_id': merchant_id, 'balance_kes': 0.0, 'lifetime_deposits_kes': 0.0}


def submit_deposit_request(merchant_id: str, amount_kes: float, mpesa_code: str | None = None, screenshot_url: str | None = None):
    return insert('deposit_requests', {
        'merchant_id': merchant_id,
        'amount_kes': amount_kes,
        'mpesa_code': mpesa_code,
        'screenshot_url': screenshot_url,
        'status': 'pending',
    })


def credit_merchant_escrow(merchant_id: str, amount_kes: float):
    current = get_merchant_escrow(merchant_id)
    rows = select('merchant_escrow', {'merchant_id': f'eq.{merchant_id}', 'select': '*', 'limit': 1})
    if rows:
        return update('merchant_escrow', {
            'balance_kes': float(current.get('balance_kes') or 0) + amount_kes,
            'lifetime_deposits_kes': float(current.get('lifetime_deposits_kes') or 0) + amount_kes,
            'updated_at': utcnow_iso(),
        }, {'merchant_id': f'eq.{merchant_id}'})
    return insert('merchant_escrow', {
        'merchant_id': merchant_id,
        'balance_kes': amount_kes,
        'lifetime_deposits_kes': amount_kes,
    })
