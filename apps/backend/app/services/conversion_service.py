from fastapi import HTTPException, status

from app.db.supabase import insert, select, update
from app.utils.helpers import utcnow_iso


def _to_number(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def get_conversion(conversion_id: str) -> dict | None:
    rows = select('conversions', params={'id': f'eq.{conversion_id}', 'select': '*', 'limit': 1})
    return rows[0] if rows else None


def get_link_by_code(code: str, product_id: str | None = None) -> dict | None:
    params = {
        'unique_code': f'eq.{code}',
        'select': '*',
        'limit': 1,
    }
    if product_id:
        params['product_id'] = f'eq.{product_id}'
    rows = select('affiliate_links', params=params)
    return rows[0] if rows else None


def reserve_merchant_commission(merchant_id: str, commission_kes: float) -> dict:
    escrows = select('merchant_escrow', params={'merchant_id': f'eq.{merchant_id}', 'select': '*', 'limit': 1})
    if not escrows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Fund your merchant escrow before recording affiliate sales.')

    escrow = escrows[0]
    available = _to_number(escrow.get('balance_kes'))
    reserved = _to_number(escrow.get('reserved_balance_kes'))
    if available < commission_kes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Your available escrow balance is too low for this commission.')

    updated_rows = update(
        'merchant_escrow',
        {
            'balance_kes': available - commission_kes,
            'reserved_balance_kes': reserved + commission_kes,
            'updated_at': utcnow_iso(),
        },
        {'id': f"eq.{escrow['id']}"},
    )
    return updated_rows[0] if updated_rows else escrow


def release_reserved_commission(merchant_id: str, amount_kes: float) -> dict | None:
    escrows = select('merchant_escrow', params={'merchant_id': f'eq.{merchant_id}', 'select': '*', 'limit': 1})
    if not escrows:
        return None

    escrow = escrows[0]
    available = _to_number(escrow.get('balance_kes'))
    reserved = _to_number(escrow.get('reserved_balance_kes'))
    updated_rows = update(
        'merchant_escrow',
        {
            'balance_kes': available + amount_kes,
            'reserved_balance_kes': max(0.0, reserved - amount_kes),
            'updated_at': utcnow_iso(),
        },
        {'id': f"eq.{escrow['id']}"},
    )
    return updated_rows[0] if updated_rows else escrow


def consume_reserved_commission(merchant_id: str, amount_kes: float) -> dict | None:
    escrows = select('merchant_escrow', params={'merchant_id': f'eq.{merchant_id}', 'select': '*', 'limit': 1})
    if not escrows:
        return None

    escrow = escrows[0]
    reserved = _to_number(escrow.get('reserved_balance_kes'))
    updated_rows = update(
        'merchant_escrow',
        {
            'reserved_balance_kes': max(0.0, reserved - amount_kes),
            'updated_at': utcnow_iso(),
        },
        {'id': f"eq.{escrow['id']}"},
    )
    return updated_rows[0] if updated_rows else escrow


def approve_conversion(conversion_id: str, approver_id: str) -> dict:
    conversion = get_conversion(conversion_id)
    if not conversion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Conversion not found.')

    if conversion.get('status') == 'approved':
        return conversion
    if conversion.get('status') == 'rejected':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Rejected conversions cannot be approved.')

    now = utcnow_iso()
    updated_rows = update(
        'conversions',
        {
            'status': 'approved',
            'merchant_approved': True,
            'approved_at': now,
            'approved_by': approver_id,
            'rejection_reason': None,
        },
        {'id': f'eq.{conversion_id}'},
    )
    approved = updated_rows[0] if updated_rows else conversion

    commission = _to_number(approved.get('commission_earned_kes'))
    reserved_commission = _to_number(approved.get('reserved_commission_kes')) or commission
    consume_reserved_commission(approved['merchant_id'], reserved_commission)

    payout_rows = select('payouts', params={'conversion_id': f'eq.{conversion_id}', 'select': '*', 'limit': 1})
    if not payout_rows:
        insert(
            'payouts',
            {
                'affiliate_id': approved['affiliate_id'],
                'amount_kes': commission,
                'status': 'pending',
                'conversion_id': conversion_id,
            },
        )

    if approved.get('link_id'):
        link_rows = select('affiliate_links', params={'id': f"eq.{approved['link_id']}", 'select': '*', 'limit': 1})
        if link_rows:
            link = link_rows[0]
            update(
                'affiliate_links',
                {
                    'conversions': int(link.get('conversions') or 0) + 1,
                    'total_earned_kes': _to_number(link.get('total_earned_kes')) + commission,
                },
                {'id': f"eq.{link['id']}"},
            )

    return approved


def reject_conversion(conversion_id: str, approver_id: str, reason: str) -> dict:
    conversion = get_conversion(conversion_id)
    if not conversion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Conversion not found.')

    if conversion.get('status') == 'rejected':
        return conversion

    commission = _to_number(conversion.get('reserved_commission_kes')) or _to_number(conversion.get('commission_earned_kes'))
    release_reserved_commission(conversion['merchant_id'], commission)

    updated_rows = update(
        'conversions',
        {
            'status': 'rejected',
            'approved_by': approver_id,
            'rejection_reason': reason,
            'review_notes': reason,
        },
        {'id': f'eq.{conversion_id}'},
    )
    return updated_rows[0] if updated_rows else conversion
