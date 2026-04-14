from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, require_role
from app.db.supabase import select

router = APIRouter()


@router.get('')
def list_products(user=Depends(get_current_user)):
    profile = require_role(user['id'], 'merchant')
    items = select('products', {'merchant_id': f'eq.{profile["id"]}', 'select': '*', 'order': 'created_at.desc'})
    return {'items': items}


@router.get('/marketplace')
def list_marketplace_products(user=Depends(get_current_user)):
    require_role(user['id'], 'affiliate')
    items = select('products', {'is_active': 'eq.true', 'moderation_status': 'eq.approved', 'select': '*', 'order': 'created_at.desc'})
    return {'items': items}
