from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, require_role
from app.db.supabase import select, update

router = APIRouter()


@router.get('')
def list_orders(user=Depends(get_current_user)):
    profile = require_role(user['id'], 'merchant')
    items = select('conversions', {'merchant_id': f'eq.{profile["id"]}', 'select': '*', 'order': 'created_at.desc'})
    return {'items': items}


@router.post('/{conversion_id}/approve')
def approve_order(conversion_id: str, user=Depends(get_current_user)):
    profile = require_role(user['id'], 'merchant')
    update('conversions', {'status': 'approved', 'merchant_approved': True}, {'id': f'eq.{conversion_id}', 'merchant_id': f'eq.{profile["id"]}'})
    return {'status': 'approved', 'conversion_id': conversion_id}
