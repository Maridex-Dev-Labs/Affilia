from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, get_profile, require_role
from app.db.supabase import select

router = APIRouter()


@router.get('')
def list_transactions(user=Depends(get_current_user)):
    profile = get_profile(user['id']) or {}
    role = profile.get('role')
    if role == 'merchant':
        return {'items': select('deposit_requests', {'merchant_id': f'eq.{user["id"]}', 'select': '*', 'order': 'created_at.desc'})}
    if role == 'affiliate':
        return {'items': select('payouts', {'affiliate_id': f'eq.{user["id"]}', 'select': '*', 'order': 'created_at.desc'})}
    require_role(user['id'], 'admin')
    return {'items': select('official_receipts', {'select': '*', 'order': 'generated_at.desc'})}
