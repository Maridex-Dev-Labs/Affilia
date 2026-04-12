from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, get_profile, require_role
from app.db.supabase import select

router = APIRouter()

@router.get('/{receipt_id}')
def get_receipt(receipt_id: str, user=Depends(get_current_user)):
    receipts = select('official_receipts', params={'id': f'eq.{receipt_id}', 'limit': 1})
    if not receipts:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Receipt not found')

    receipt = receipts[0]
    profile = get_profile(user['id'])
    is_admin = True
    try:
        require_role(user['id'], 'admin')
    except HTTPException:
        is_admin = False

    if not is_admin and (not profile or receipt.get('recipient_id') != profile['id']):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Receipt access denied')

    return receipt
