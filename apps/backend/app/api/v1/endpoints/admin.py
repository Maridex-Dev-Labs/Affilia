from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, require_admin_permission
from app.db.supabase import select, update, insert

router = APIRouter()

@router.get('/verification-queue')
def verification_queue(user=Depends(get_current_user)):
    require_admin_permission(user['id'], 'merchant.verify')
    items = select('profiles', params={'business_verified': 'eq.false', 'role': 'eq.merchant', 'select': '*'})
    return {'items': items}

@router.post('/verify-merchant/{merchant_id}')
def verify_merchant(merchant_id: str, user=Depends(get_current_user)):
    require_admin_permission(user['id'], 'merchant.verify')
    update('profiles', {'business_verified': True}, params={'id': f'eq.{merchant_id}'})
    return {'status': 'approved', 'merchant_id': merchant_id}

@router.get('/deposits/pending')
def pending_deposits(user=Depends(get_current_user)):
    require_admin_permission(user['id'], 'deposit.approve')
    items = select(
        'deposit_requests',
        params={
            'status': 'eq.pending',
            'select': '*,profiles:merchant_id(business_name,full_name,phone_number)',
            'order': 'created_at.desc',
        },
    )
    return {'items': items}

@router.post('/deposits/{deposit_id}/approve')
def approve_deposit(deposit_id: str, user=Depends(get_current_user)):
    require_admin_permission(user['id'], 'deposit.approve')
    deposits = select('deposit_requests', params={'id': f'eq.{deposit_id}', 'select': '*', 'limit': 1})
    if not deposits:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Deposit request not found')
    deposit = deposits[0]

    if deposit.get('status') == 'approved':
        return {'status': 'approved', 'deposit_id': deposit_id}

    update(
        'deposit_requests',
        {'status': 'approved', 'approved_by': user['id'], 'approved_at': __import__('datetime').datetime.utcnow().isoformat()},
        params={'id': f'eq.{deposit_id}'},
    )
    escrows = select('merchant_escrow', params={'merchant_id': f"eq.{deposit['merchant_id']}", 'select': '*', 'limit': 1})
    amount = float(deposit.get('amount_kes') or 0)
    if escrows:
        new_balance = float(escrows[0].get('balance_kes') or 0) + amount
        lifetime = float(escrows[0].get('lifetime_deposits_kes') or 0) + amount
        update(
            'merchant_escrow',
            {'balance_kes': new_balance, 'lifetime_deposits_kes': lifetime},
            params={'id': f"eq.{escrows[0]['id']}"},
        )
    else:
        insert(
            'merchant_escrow',
            {
                'merchant_id': deposit['merchant_id'],
                'balance_kes': amount,
                'lifetime_deposits_kes': amount,
            },
        )
    return {'status': 'approved', 'deposit_id': deposit_id}

@router.get('/sweep/preview')
def sweep_preview(user=Depends(get_current_user)):
    require_admin_permission(user['id'], 'payout.manage')
    payouts = select(
        'payouts',
        params={
            'status': 'eq.pending',
            'select': 'id,affiliate_id,amount_kes,status,created_at,profiles:affiliate_id(full_name,business_name)',
            'order': 'created_at.desc',
        },
    )
    total = sum(float(p.get('amount_kes') or 0) for p in payouts)
    return {'total': total, 'recipients': len(payouts), 'items': payouts}

@router.post('/sweep/confirm')
def sweep_confirm(user=Depends(get_current_user)):
    require_admin_permission(user['id'], 'payout.manage')
    payouts = select('payouts', params={'status': 'eq.pending', 'select': '*'})
    total = sum(float(p.get('amount_kes') or 0) for p in payouts)
    recipients = len(payouts)

    batch = insert(
        'sweep_batches',
        {
            'total_kes': total,
            'recipients': recipients,
            'status': 'completed',
            'confirmed_at': __import__('datetime').datetime.utcnow().isoformat(),
        },
    )
    if payouts:
        for payout in payouts:
            update(
                'payouts',
                {'status': 'paid', 'paid_at': __import__('datetime').datetime.utcnow().isoformat()},
                params={'id': f"eq.{payout['id']}"},
            )
    return {'status': 'completed', 'batch': batch[0] if isinstance(batch, list) and batch else None}
