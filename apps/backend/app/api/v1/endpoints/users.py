from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user, get_profile
from app.db.supabase import auth_admin_delete_user, insert, select, update

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


def _to_number(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _merchant_delete_blockers(user_id: str) -> list[str]:
    blockers: list[str] = []
    escrow_rows = select('merchant_escrow', params={'merchant_id': f'eq.{user_id}', 'limit': 1})
    escrow_balance = _to_number(escrow_rows[0].get('balance_kes')) if escrow_rows else 0.0
    if escrow_balance > 0:
        blockers.append(f'Merchant escrow still holds KES {escrow_balance:,.2f}. Withdraw or reconcile it first.')

    pending_deposits = select(
        'deposit_requests',
        params={'merchant_id': f'eq.{user_id}', 'status': 'eq.pending', 'select': 'id', 'limit': 1},
    )
    if pending_deposits:
        blockers.append('There is at least one pending deposit request awaiting review.')

    pending_conversions = select(
        'conversions',
        params={
            'merchant_id': f'eq.{user_id}',
            'status': 'in.(pending,approved)',
            'select': 'id',
            'limit': 1,
        },
    )
    if pending_conversions:
        blockers.append('There are unsettled merchant conversions tied to this account.')

    return blockers


def _affiliate_delete_blockers(user_id: str) -> list[str]:
    blockers: list[str] = []
    pending_payouts = select(
        'payouts',
        params={'affiliate_id': f'eq.{user_id}', 'status': 'eq.pending', 'select': 'id', 'limit': 1},
    )
    if pending_payouts:
        blockers.append('There is a pending payout scheduled for this affiliate account.')

    unsettled_conversions = select(
        'conversions',
        params={
            'affiliate_id': f'eq.{user_id}',
            'status': 'in.(pending,approved)',
            'select': 'id',
            'limit': 1,
        },
    )
    if unsettled_conversions:
        blockers.append('There are unsettled commissions still linked to this affiliate account.')

    return blockers


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
    if payload.confirmation_text.strip().upper() != 'DELETE':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Type DELETE to confirm account deletion.')

    profile = get_profile(user['id'])
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Profile not found.')

    blockers: list[str] = []
    if profile.get('role') == 'merchant':
        blockers = _merchant_delete_blockers(user['id'])
    elif profile.get('role') == 'affiliate':
        blockers = _affiliate_delete_blockers(user['id'])

    if blockers:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=' '.join(blockers),
        )

    insert(
        'admin_audit_log',
        {
            'action_type': 'account_deleted_by_owner',
            'target_type': 'profile',
            'target_id': user['id'],
            'previous_state': {
                'role': profile.get('role'),
                'business_name': profile.get('business_name'),
                'full_name': profile.get('full_name'),
            },
            'new_state': {'status': 'deleted'},
        },
    )

    auth_admin_delete_user(user['id'])
    return {'status': 'deleted'}
