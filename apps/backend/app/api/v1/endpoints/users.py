from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user, get_profile
from app.db.supabase import update
from app.services.account_service import (
    account_deletion_status,
    cancel_account_deletion,
    delete_account_now,
    schedule_account_deletion,
)

router = APIRouter()


class ProfileUpdatePayload(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    phone_number: str | None = None
    payout_phone: str | None = None
    business_name: str | None = None
    mpesa_till: str | None = None
    store_description: str | None = None
    niches: list[str] | None = None
    promotion_channels: list[str] | None = None


class MerchantVerificationPayload(BaseModel):
    business_document_path: str


class DeleteAccountPayload(BaseModel):
    confirmation_text: str
    mode: str = 'scheduled'


@router.get('/me')
def me(user=Depends(get_current_user)):
    return {'profile': get_profile(user['id'])}


@router.patch('/me')
def update_me(payload: ProfileUpdatePayload, user=Depends(get_current_user)):
    values = {key: value for key, value in payload.model_dump().items() if value is not None}
    if values:
        update('profiles', values, {'id': f'eq.{user["id"]}'})
    return {'status': 'updated'}


@router.post('/merchant-verification')
def submit_merchant_verification(payload: MerchantVerificationPayload, user=Depends(get_current_user)):
    profile = get_profile(user['id'])
    if not profile or profile.get('role') != 'merchant':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only merchants can submit business verification.')

    if not profile.get('business_name'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Save your business name before submitting verification.')
    if not profile.get('phone_number'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Save your primary phone number before submitting verification.')
    if not payload.business_document_path.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Upload your business document before submitting verification.')

    documents = profile.get('documents') or {}
    merchant_documents = dict(documents.get('merchant_verification') or {})
    merchant_documents.update({
        'business_document_path': payload.business_document_path.strip(),
        'status': 'submitted',
        'submitted_at': __import__('datetime').datetime.utcnow().isoformat(),
    })
    documents['registration'] = payload.business_document_path.strip()
    documents['merchant_verification'] = merchant_documents

    rows = update(
        'profiles',
        {
            'documents': documents,
            'business_verified': False,
        },
        {'id': f'eq.{user["id"]}'},
    )
    return {'status': 'submitted', 'profile': rows[0] if rows else None}


@router.post('/delete-account')
def delete_me(payload: DeleteAccountPayload, user=Depends(get_current_user)):
    profile = get_profile(user['id'])
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Profile not found.')

    if payload.confirmation_text.strip().upper() != 'DELETE':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Type DELETE to confirm account deletion.')

    if payload.mode == 'immediate':
        return delete_account_now(profile, actor_id=user['id'], actor_type='owner')
    return schedule_account_deletion(profile, actor_id=user['id'], actor_type='owner')


@router.get('/account-deletion-status')
def deletion_status(user=Depends(get_current_user)):
    profile = get_profile(user['id'])
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Profile not found.')
    return account_deletion_status(profile)


@router.post('/cancel-account-deletion')
def cancel_delete_me(user=Depends(get_current_user)):
    profile = get_profile(user['id'])
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Profile not found.')
    return cancel_account_deletion(profile, actor_id=user['id'], actor_type='owner')
