from fastapi import APIRouter, Depends
from app.api.deps import get_current_user, require_role
from app.db.supabase import select, update, insert

router = APIRouter()

@router.get('/verification-queue')
def verification_queue(user=Depends(get_current_user)):
    require_role(user['id'], 'admin')
    items = select('profiles', params={'business_verified': 'eq.false', 'role': 'eq.merchant', 'select': '*'})
    return {'items': items}

@router.post('/verify-merchant/{merchant_id}')
def verify_merchant(merchant_id: str, user=Depends(get_current_user)):
    require_role(user['id'], 'admin')
    update('profiles', {'business_verified': True}, params={'id': f'eq.{merchant_id}'})
    return {'status': 'approved', 'merchant_id': merchant_id}

@router.get('/deposits/pending')
def pending_deposits(user=Depends(get_current_user)):
    require_role(user['id'], 'admin')
    items = select('deposit_requests', params={'status': 'eq.pending', 'select': '*'})
    return {'items': items}

@router.post('/deposits/{deposit_id}/approve')
def approve_deposit(deposit_id: str, user=Depends(get_current_user)):
    require_role(user['id'], 'admin')
    deposits = select('deposit_requests', params={'id': f'eq.{deposit_id}', 'select': '*', 'limit': 1})
    if not deposits:
        return {'status': 'not_found'}
    deposit = deposits[0]
    update('deposit_requests', {'status': 'approved', 'approved_by': user['id']}, params={'id': f'eq.{deposit_id}'})
    # update escrow
    escrows = select('merchant_escrow', params={'merchant_id': f"eq.{deposit['merchant_id']}", 'select': '*', 'limit': 1})
    if escrows:
        new_balance = float(escrows[0]['balance_kes']) + float(deposit['amount_kes'])
        update('merchant_escrow', {'balance_kes': new_balance}, params={'id': f"eq.{escrows[0]['id']}"})
    else:
        insert('merchant_escrow', {'merchant_id': deposit['merchant_id'], 'balance_kes': deposit['amount_kes']})
    return {'status': 'approved', 'deposit_id': deposit_id}

@router.get('/sweep/preview')
def sweep_preview(user=Depends(get_current_user)):
    require_role(user['id'], 'admin')
    payouts = select('payouts', params={'status': 'eq.pending', 'select': '*'})
    total = sum([p.get('amount_kes', 0) for p in payouts])
    return {'total': total, 'recipients': len(payouts)}

@router.post('/sweep/confirm')
def sweep_confirm(user=Depends(get_current_user)):
    require_role(user['id'], 'admin')
    insert('sweep_batches', {'total_kes': 0, 'recipients': 0, 'status': 'completed'})
    return {'status': 'completed'}
