from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.deps import get_current_user, get_profile, require_admin_permission
from app.db.supabase import insert, select, update
from app.services.contract_service import (
    CONTRACT_CONTENT,
    CURRENT_CONTRACT_VERSION,
    ContractPDFGenerator,
    agreement_snapshot,
    review_dates,
)

router = APIRouter()
AgreementType = Literal['merchant', 'affiliate']
AgreementStatus = Literal['submitted', 'approved', 'rejected', 'revision_requested', 'superseded']


class SubmitAgreementPayload(BaseModel):
    agreement_type: AgreementType
    acceptance_method: Literal['digital_signature', 'uploaded_pdf', 'manual_signature']
    accepted_terms: bool
    accepted_fees: bool
    accepted_privacy: bool
    accepted_dispute: bool
    digital_signature: str | None = None
    signature_full_name: str | None = None
    signed_contract_storage_path: str | None = None
    signed_contract_filename: str | None = None
    signed_contract_size_bytes: int | None = None
    signed_contract_mime_type: str | None = None


class ReviewAgreementPayload(BaseModel):
    action: Literal['approve', 'reject', 'request_revision']
    review_notes: str | None = None
    rejection_reason: str | None = None


class CurrentAgreementResponse(BaseModel):
    agreement: dict | None
    contract_status: str | None
    current_agreement_id: str | None
    expected_type: AgreementType | None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_role(profile: dict, agreement_type: AgreementType):
    if not profile or profile.get('role') != agreement_type:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Agreement type does not match this account role.')


def _insert_event(agreement_id: str, action: str, actor_id: str | None, notes: str | None = None):
    insert(
        'legal_agreement_events',
        {
            'agreement_id': agreement_id,
            'actor_id': actor_id,
            'action': action,
            'notes': notes,
        },
    )


def _profile_contract_type(profile: dict | None) -> AgreementType | None:
    if not profile:
        return None
    role = profile.get('role')
    if role in {'merchant', 'affiliate'}:
        return role
    return None


@router.get('/current', response_model=CurrentAgreementResponse)
def current_contract(
    agreement_type: AgreementType | None = Query(default=None),
    user=Depends(get_current_user),
):
    profile = get_profile(user['id'])
    expected_type = agreement_type or _profile_contract_type(profile)
    agreements = []
    if expected_type:
        agreements = select(
            'legal_agreements',
            params={
                'user_id': f'eq.{user["id"]}',
                'agreement_type': f'eq.{expected_type}',
                'select': '*',
                'order': 'created_at.desc',
                'limit': 1,
            },
        )
    return {
        'agreement': agreements[0] if agreements else None,
        'contract_status': profile.get('contract_status') if profile else None,
        'current_agreement_id': profile.get('current_agreement_id') if profile else None,
        'expected_type': expected_type,
    }


@router.get('/{agreement_type}/download')
def download_contract(agreement_type: AgreementType, user=Depends(get_current_user)):
    profile = get_profile(user['id'])
    _validate_role(profile, agreement_type)

    pdf = ContractPDFGenerator(agreement_type, profile or {}).generate()
    filename = f"Affilia_{agreement_type.capitalize()}_Agreement_v{CURRENT_CONTRACT_VERSION.replace('.', '_')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf),
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


@router.post('/submit')
def submit_contract(payload: SubmitAgreementPayload, request: Request, user=Depends(get_current_user)):
    profile = get_profile(user['id'])
    _validate_role(profile, payload.agreement_type)

    if not all([payload.accepted_terms, payload.accepted_fees, payload.accepted_privacy, payload.accepted_dispute]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='All legal acknowledgements must be accepted before submission.')

    if payload.acceptance_method == 'digital_signature' and not payload.digital_signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='A digital signature is required for this submission method.')

    if payload.acceptance_method != 'digital_signature' and not payload.signed_contract_storage_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Upload the signed contract before submitting.')

    open_agreements = select(
        'legal_agreements',
        params={
            'user_id': f'eq.{user["id"]}',
            'agreement_type': f'eq.{payload.agreement_type}',
            'status': 'in.(pending,submitted,rejected,revision_requested)',
            'select': 'id,status',
        },
    )
    for agreement in open_agreements:
        update('legal_agreements', {'status': 'superseded'}, {'id': f'eq.{agreement["id"]}'})
        _insert_event(agreement['id'], 'superseded', user['id'], 'Replaced by a newer submission.')

    submission = insert(
        'legal_agreements',
        {
            'agreement_type': payload.agreement_type,
            'user_id': user['id'],
            'version': CURRENT_CONTRACT_VERSION,
            'status': 'submitted',
            'acceptance_method': payload.acceptance_method,
            'digital_signature': payload.digital_signature,
            'digital_signature_date': _now_iso() if payload.digital_signature else None,
            'digital_signature_ip': request.client.host if request.client else None,
            'signature_full_name': payload.signature_full_name,
            'accepted_terms': payload.accepted_terms,
            'accepted_fees': payload.accepted_fees,
            'accepted_privacy': payload.accepted_privacy,
            'accepted_dispute': payload.accepted_dispute,
            'signed_contract_storage_path': payload.signed_contract_storage_path,
            'signed_contract_filename': payload.signed_contract_filename,
            'signed_contract_size_bytes': payload.signed_contract_size_bytes,
            'signed_contract_mime_type': payload.signed_contract_mime_type,
            'submitted_at': _now_iso(),
            'contract_snapshot': agreement_snapshot(payload.agreement_type, profile or {}),
        },
    )
    if not submission:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Failed to create legal agreement record.')

    agreement = submission[0]
    update(
        'profiles',
        {
            'contract_status': 'under_review',
            'current_agreement_id': agreement['id'],
        },
        {'id': f'eq.{user["id"]}'},
    )
    _insert_event(agreement['id'], 'submitted', user['id'], 'User submitted agreement for review.')
    return {'status': 'submitted', 'agreement': agreement}


@router.get('/admin/review-queue')
def review_queue(user=Depends(get_current_user)):
    require_admin_permission(user['id'], 'legal.review')
    items = select(
        'legal_agreements',
        params={
            'status': 'eq.submitted',
            'select': '*,profile:user_id(id,role,full_name,business_name,phone_number,payout_phone,mpesa_till,contract_status)',
            'order': 'submitted_at.asc',
        },
    )
    return {'items': items, 'contract_types': CONTRACT_CONTENT}


@router.post('/admin/{agreement_id}/review')
def review_contract(agreement_id: str, payload: ReviewAgreementPayload, user=Depends(get_current_user)):
    require_admin_permission(user['id'], 'legal.review')
    agreements = select('legal_agreements', params={'id': f'eq.{agreement_id}', 'select': '*', 'limit': 1})
    if not agreements:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Legal agreement not found.')

    agreement = agreements[0]
    if payload.action in {'reject', 'request_revision'} and not payload.rejection_reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='A user-facing rejection or revision reason is required.')

    now_iso = _now_iso()
    update_payload: dict[str, object] = {
        'reviewed_by': user['id'],
        'reviewed_at': now_iso,
        'review_notes': payload.review_notes,
        'rejection_reason': payload.rejection_reason,
    }

    profile_status = 'under_review'
    audit_action = payload.action
    if payload.action == 'approve':
        effective, expiry = review_dates()
        update_payload.update({
            'status': 'approved',
            'effective_date': effective.isoformat(),
            'expiry_date': expiry.isoformat(),
            'rejection_reason': None,
        })
        profile_status = 'active'
        audit_action = 'approved'
    elif payload.action == 'reject':
        update_payload.update({'status': 'rejected'})
        profile_status = 'rejected'
    else:
        update_payload.update({'status': 'revision_requested'})
        profile_status = 'revision_requested'

    update('legal_agreements', update_payload, {'id': f'eq.{agreement_id}'})
    update(
        'profiles',
        {
            'contract_status': profile_status,
            'current_agreement_id': agreement_id,
            'onboarding_complete': True,
        },
        {'id': f'eq.{agreement["user_id"]}'},
    )
    _insert_event(agreement_id, audit_action, user['id'], payload.review_notes or payload.rejection_reason)
    return {'status': update_payload['status'], 'agreement_id': agreement_id}
