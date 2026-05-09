from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user, require_admin_permission, require_any_admin_permission
from app.db.supabase import select, update, insert
from app.services.account_service import (
    block_account,
    cancel_account_deletion,
    delete_account_now,
    restore_account,
    revoke_user_access,
    schedule_account_deletion,
    warn_account,
)
from app.services.conversion_service import approve_conversion, reject_conversion
from app.services.payout_service import confirm_pending_payouts
from app.services.receipt_service import create_official_receipt
from app.services.plan_service import activate_profile_plan, reject_profile_plan, revoke_profile_plan, reactivate_profile_plan


class ReviewPayload(BaseModel):
    notes: str | None = None


class RejectionPayload(BaseModel):
    reason: str


class WarningPayload(BaseModel):
    message: str

router = APIRouter()

@router.get('/verification-queue')
def verification_queue(user=Depends(get_current_user)):
    require_any_admin_permission(user, ['merchant.verify', 'affiliate.verify'])
    merchant_rows = select(
        'profiles',
        params={
            'role': 'eq.merchant',
            'select': 'id,business_name,full_name,phone_number,business_verified,mpesa_till,documents,avatar_url,contract_status,store_description,current_agreement:current_agreement_id(id,signed_contract_storage_path,signed_contract_filename,digital_signature,acceptance_method)',
            'order': 'created_at.desc',
        },
    )
    merchant_items = []
    for row in merchant_rows:
        documents = row.get('documents') or {}
        verification = documents.get('merchant_verification') or {}
        status_value = verification.get('status') or ('verified' if row.get('business_verified') else 'not_started')
        if status_value not in ('submitted', 'under_review', 'revision_requested', 'rejected'):
            continue
        merchant_items.append({
            **row,
            'merchant_verification_status': status_value,
            'merchant_verification_notes': verification.get('notes'),
        })

    affiliate_items = select(
        'profiles',
        params={
            'role': 'eq.affiliate',
            'affiliate_verification_status': 'in.(submitted,under_review,revision_requested,restricted_duplicate,rejected)',
            'select': 'id,full_name,phone_number,payout_phone,national_id_number,affiliate_verification_status,duplicate_flag_reason,affiliate_verification_notes,avatar_url,contract_status,documents,current_agreement:current_agreement_id(id,signed_contract_storage_path,signed_contract_filename,digital_signature,acceptance_method)',
            'order': 'created_at.desc',
        },
    )
    return {'merchants': merchant_items, 'affiliates': affiliate_items}

@router.post('/verify-merchant/{merchant_id}')
def verify_merchant(merchant_id: str, user=Depends(get_current_user)):
    require_admin_permission(user, 'merchant.verify')
    profiles = select('profiles', params={'id': f'eq.{merchant_id}', 'role': 'eq.merchant', 'select': 'id,documents', 'limit': 1})
    if not profiles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Merchant not found')
    documents = profiles[0].get('documents') or {}
    merchant_documents = dict(documents.get('merchant_verification') or {})
    merchant_documents.update({
        'status': 'verified',
        'reviewed_at': __import__('datetime').datetime.utcnow().isoformat(),
        'reviewed_by': user['id'],
    })
    documents['merchant_verification'] = merchant_documents
    update('profiles', {'business_verified': True, 'documents': documents}, params={'id': f'eq.{merchant_id}'})
    return {'status': 'approved', 'merchant_id': merchant_id}


@router.post('/verify-merchant/{merchant_id}/reject')
def reject_merchant(merchant_id: str, payload: RejectionPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'merchant.verify')
    profiles = select('profiles', params={'id': f'eq.{merchant_id}', 'role': 'eq.merchant', 'select': 'id,documents', 'limit': 1})
    if not profiles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Merchant not found')
    documents = profiles[0].get('documents') or {}
    merchant_documents = dict(documents.get('merchant_verification') or {})
    merchant_documents.update({
        'status': 'revision_requested',
        'notes': payload.reason,
        'reviewed_at': __import__('datetime').datetime.utcnow().isoformat(),
        'reviewed_by': user['id'],
    })
    documents['merchant_verification'] = merchant_documents
    update('profiles', {'business_verified': False, 'documents': documents}, params={'id': f'eq.{merchant_id}'})
    return {'status': 'revision_requested', 'merchant_id': merchant_id}


@router.post('/verify-affiliate/{affiliate_id}')
def verify_affiliate(affiliate_id: str, payload: ReviewPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'affiliate.verify')
    profiles = select('profiles', params={'id': f'eq.{affiliate_id}', 'role': 'eq.affiliate', 'select': 'documents', 'limit': 1})
    if not profiles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Affiliate not found')
    documents = profiles[0].get('documents') or {}
    affiliate_documents = dict(documents.get('affiliate_verification') or {})
    affiliate_documents.update({
        'status': 'verified',
        'reviewed_at': __import__('datetime').datetime.utcnow().isoformat(),
        'reviewed_by': user['id'],
    })
    documents['affiliate_verification'] = affiliate_documents
    rows = update(
        'profiles',
        {
            'affiliate_verification_status': 'verified',
            'affiliate_verification_notes': payload.notes,
            'affiliate_verified_at': __import__('datetime').datetime.utcnow().isoformat(),
            'affiliate_verified_by': user['id'],
            'duplicate_flag_reason': None,
            'documents': documents,
        },
        params={'id': f'eq.{affiliate_id}', 'role': 'eq.affiliate'},
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Affiliate not found')
    return {'status': 'approved', 'affiliate_id': affiliate_id}


@router.post('/verify-affiliate/{affiliate_id}/reject')
def reject_affiliate_verification(affiliate_id: str, payload: RejectionPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'affiliate.verify')
    profiles = select('profiles', params={'id': f'eq.{affiliate_id}', 'role': 'eq.affiliate', 'select': 'documents', 'limit': 1})
    if not profiles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Affiliate not found')
    documents = profiles[0].get('documents') or {}
    affiliate_documents = dict(documents.get('affiliate_verification') or {})
    affiliate_documents.update({
        'status': 'revision_requested',
        'notes': payload.reason,
        'reviewed_at': __import__('datetime').datetime.utcnow().isoformat(),
        'reviewed_by': user['id'],
    })
    documents['affiliate_verification'] = affiliate_documents
    rows = update(
        'profiles',
        {
            'affiliate_verification_status': 'revision_requested',
            'affiliate_verification_notes': payload.reason,
            'documents': documents,
        },
        params={'id': f'eq.{affiliate_id}', 'role': 'eq.affiliate'},
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Affiliate not found')
    return {'status': 'rejected', 'affiliate_id': affiliate_id}

@router.get('/deposits/pending')
def pending_deposits(user=Depends(get_current_user)):
    require_admin_permission(user, 'deposit.approve')
    items = select(
        'deposit_requests',
        params={
            'status': 'eq.pending',
            'select': '*,profiles:merchant_id(business_name,full_name,phone_number)',
            'order': 'created_at.desc',
        },
    )
    return {'items': items}


@router.get('/billing/pending')
def pending_billing(user=Depends(get_current_user)):
    require_admin_permission(user, 'billing.approve')
    items = select(
        'profile_plan_selections',
        params={
            'status': 'in.(pending_verification,active,cancelled,expired)',
            'select': '*,profiles:profile_id(full_name,business_name,phone_number,role,active_plan_code,plan_status)',
            'order': 'updated_at.desc',
        },
    )
    return {'items': items}


@router.post('/billing/{profile_id}/approve')
def approve_billing(profile_id: str, payload: ReviewPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'billing.approve')
    plan = activate_profile_plan(profile_id, approver_id=user['id'], notes=payload.notes)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Pending billing record not found')
    return {'status': 'approved', 'plan': plan}


@router.post('/billing/{profile_id}/reject')
def reject_billing(profile_id: str, payload: RejectionPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'billing.approve')
    plan = reject_profile_plan(profile_id, approver_id=user['id'], notes=payload.reason)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Pending billing record not found')
    return {'status': 'rejected', 'plan': plan}


@router.post('/billing/{profile_id}/revoke')
def revoke_billing(profile_id: str, payload: RejectionPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'billing.approve')
    plan = revoke_profile_plan(profile_id, approver_id=user['id'], notes=payload.reason)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Active billing record not found')
    return {'status': 'revoked', 'plan': plan}


@router.post('/billing/{profile_id}/reactivate')
def reactivate_billing(profile_id: str, payload: ReviewPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'billing.approve')
    plan = reactivate_profile_plan(profile_id, approver_id=user['id'], notes=payload.notes)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Reactivatable billing record not found')
    return {'status': 'reactivated', 'plan': plan}


@router.post('/users/{profile_id}/warn')
def warn_user(profile_id: str, payload: WarningPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'user.manage')
    profiles = select('profiles', params={'id': f'eq.{profile_id}', 'select': '*', 'limit': 1})
    if not profiles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    return {'status': 'warned', 'account': warn_account(profiles[0], actor_id=user['id'], message=payload.message)}


@router.post('/users/{profile_id}/block')
def block_user(profile_id: str, payload: RejectionPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'user.manage')
    profiles = select('profiles', params={'id': f'eq.{profile_id}', 'select': '*', 'limit': 1})
    if not profiles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    return {'status': 'blocked', 'account': block_account(profiles[0], actor_id=user['id'], reason=payload.reason)}


@router.post('/users/{profile_id}/restore')
def restore_user(profile_id: str, user=Depends(get_current_user)):
    require_admin_permission(user, 'user.manage')
    profiles = select('profiles', params={'id': f'eq.{profile_id}', 'select': '*', 'limit': 1})
    if not profiles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    return {'status': 'active', 'account': restore_account(profiles[0], actor_id=user['id'])}


@router.post('/users/{profile_id}/revoke')
def revoke_user(profile_id: str, payload: RejectionPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'user.manage')
    profiles = select('profiles', params={'id': f'eq.{profile_id}', 'select': '*', 'limit': 1})
    if not profiles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    updated = revoke_user_access(profiles[0], actor_id=user['id'], reason=payload.reason)
    return {'status': 'revoked', 'profile': updated}


@router.post('/users/{profile_id}/schedule-deletion')
def schedule_delete_user(profile_id: str, payload: RejectionPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'user.manage')
    profiles = select('profiles', params={'id': f'eq.{profile_id}', 'select': '*', 'limit': 1})
    if not profiles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    return {'status': 'scheduled_for_deletion', 'account': schedule_account_deletion(profiles[0], actor_id=user['id'], actor_type='admin', reason=payload.reason)}


@router.post('/users/{profile_id}/cancel-deletion')
def cancel_delete_user(profile_id: str, user=Depends(get_current_user)):
    require_admin_permission(user, 'user.manage')
    profiles = select('profiles', params={'id': f'eq.{profile_id}', 'select': '*', 'limit': 1})
    if not profiles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    return {'status': 'active', 'account': cancel_account_deletion(profiles[0], actor_id=user['id'], actor_type='admin')}


@router.post('/users/{profile_id}/delete')
def delete_user(profile_id: str, payload: RejectionPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'user.manage')
    profiles = select('profiles', params={'id': f'eq.{profile_id}', 'select': '*', 'limit': 1})
    if not profiles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    return delete_account_now(profiles[0], actor_id=user['id'], actor_type='admin', reason=payload.reason)

@router.post('/deposits/{deposit_id}/approve')
def approve_deposit(deposit_id: str, user=Depends(get_current_user)):
    require_admin_permission(user, 'deposit.approve')
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

    create_official_receipt(
        receipt_type='deposit',
        recipient_id=deposit['merchant_id'],
        amount_kes=amount,
        generated_by=user['id'],
        mpesa_reference=deposit.get('mpesa_code'),
    )
    return {'status': 'approved', 'deposit_id': deposit_id}

@router.get('/sweep/preview')
def sweep_preview(user=Depends(get_current_user)):
    require_admin_permission(user, 'payout.manage')
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


@router.get('/sales-review/pending')
def pending_sales_review(user=Depends(get_current_user)):
    require_admin_permission(user, 'conversion.review')
    rows = select(
        'conversions',
        params={
            'status': 'eq.pending',
            'entry_mode': 'eq.manual',
            'select': '*',
            'order': 'created_at.desc',
        },
    )
    affiliate_ids = [row.get('affiliate_id') for row in rows if row.get('affiliate_id')]
    merchant_ids = [row.get('merchant_id') for row in rows if row.get('merchant_id')]
    product_ids = [row.get('product_id') for row in rows if row.get('product_id')]

    affiliate_map = {}
    merchant_map = {}
    product_map = {}
    if affiliate_ids:
        affiliates = select('profiles', params={'id': f"in.({','.join(affiliate_ids)})", 'select': 'id,full_name,business_name'})
        affiliate_map = {row['id']: row for row in affiliates}
    if merchant_ids:
        merchants = select('profiles', params={'id': f"in.({','.join(merchant_ids)})", 'select': 'id,full_name,business_name'})
        merchant_map = {row['id']: row for row in merchants}
    if product_ids:
        products = select('products', params={'id': f"in.({','.join(product_ids)})", 'select': 'id,title'})
        product_map = {row['id']: row for row in products}

    items = [
        {
            **row,
            'affiliate_profile': affiliate_map.get(row.get('affiliate_id')),
            'merchant_profile': merchant_map.get(row.get('merchant_id')),
            'product': product_map.get(row.get('product_id')),
        }
        for row in rows
    ]
    return {'items': items}


@router.post('/sales-review/{conversion_id}/approve')
def approve_sales_review(conversion_id: str, payload: ReviewPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'conversion.review')
    conversion = approve_conversion(conversion_id, approver_id=user['id'])
    return {'status': 'approved', 'conversion': conversion, 'notes': payload.notes}


@router.post('/sales-review/{conversion_id}/reject')
def reject_sales_review(conversion_id: str, payload: RejectionPayload, user=Depends(get_current_user)):
    require_admin_permission(user, 'conversion.review')
    conversion = reject_conversion(conversion_id, approver_id=user['id'], reason=payload.reason)
    return {'status': 'rejected', 'conversion': conversion}

@router.post('/sweep/confirm')
def sweep_confirm(user=Depends(get_current_user)):
    require_admin_permission(user, 'payout.manage')
    result = confirm_pending_payouts()
    batch = result.get('batch')
    if batch:
        create_official_receipt(
            receipt_type='sweep_batch',
            recipient_id=user['id'],
            amount_kes=float(batch.get('total_kes') or 0),
            generated_by=user['id'],
            mpesa_reference=f"SWEEP-{str(batch.get('id', ''))[:8].upper()}",
        )
    return {'status': 'completed', **result}
