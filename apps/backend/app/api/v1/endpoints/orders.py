from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, require_role
from app.db.supabase import select
from app.services.conversion_service import approve_conversion

router = APIRouter()


@router.get('')
def list_orders(user=Depends(get_current_user)):
    profile = require_role(user['id'], 'merchant')
    items = select('conversions', {'merchant_id': f'eq.{profile["id"]}', 'select': '*', 'order': 'created_at.desc'})
    return {'items': items}


@router.post('/{conversion_id}/approve')
def approve_order(conversion_id: str, user=Depends(get_current_user)):
    profile = require_role(user['id'], 'merchant')
    rows = select('conversions', {'id': f'eq.{conversion_id}', 'merchant_id': f'eq.{profile["id"]}', 'select': '*', 'limit': 1})
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Conversion not found.')
    approve_conversion(conversion_id, approver_id=user['id'])
    return {'status': 'approved', 'conversion_id': conversion_id}
