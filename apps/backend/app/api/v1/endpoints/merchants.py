from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user, require_role
from app.db.supabase import insert, select
from app.services.access_service import ensure_active_plan
from app.services.conversion_service import get_link_by_code, release_reserved_commission, reserve_merchant_commission

router = APIRouter()


class ProductPayload(BaseModel):
    title: str
    description: str | None = None
    price_kes: float
    commission_percent: float
    images: list[str] = []
    category: str | None = None


class DepositPayload(BaseModel):
    amount_kes: float
    mpesa_code: str | None = None
    screenshot_url: str | None = None


class ManualSalePayload(BaseModel):
    product_id: str
    affiliate_code: str
    sale_amount_kes: float
    quantity: int = 1
    customer_reference: str
    notes: str | None = None


def _to_number(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


@router.get('/dashboard')
def dashboard(user=Depends(get_current_user)):
    profile = require_role(user['id'], 'merchant')
    merchant_id = profile['id']

    escrow_rows = select('merchant_escrow', params={'merchant_id': f'eq.{merchant_id}', 'limit': 1})
    product_rows = select('products', params={'merchant_id': f'eq.{merchant_id}', 'select': 'id,stock_status'})
    product_ids = [row['id'] for row in product_rows]

    link_rows = select('affiliate_links', params={'product_id': f'in.({",".join(product_ids)})', 'select': 'id'}) if product_ids else []
    conversion_rows = select(
        'conversions',
        params={
            'merchant_id': f'eq.{merchant_id}',
            'select': 'id,order_value_kes,commission_earned_kes,status,affiliate_id,product_id,created_at',
            'order': 'created_at.desc',
            'limit': 5,
        },
    )

    all_conversion_rows = select(
        'conversions',
        params={'merchant_id': f'eq.{merchant_id}', 'select': 'id,order_value_kes,status'},
    )

    sales_total = sum(_to_number(row.get('order_value_kes')) for row in all_conversion_rows)
    pending_orders = sum(1 for row in all_conversion_rows if row.get('status') == 'pending')
    low_stock = sum(1 for row in product_rows if row.get('stock_status') in {'low_stock', 'out'})
    escrow_balance = _to_number(escrow_rows[0].get('balance_kes')) if escrow_rows else 0.0
    reserved_balance = _to_number(escrow_rows[0].get('reserved_balance_kes')) if escrow_rows else 0.0

    pending_actions: list[str] = []
    if pending_orders:
        pending_actions.append(f'{pending_orders} orders awaiting approval')
    if low_stock:
        pending_actions.append(f'{low_stock} products low or out of stock')
    if escrow_balance < 100000:
        pending_actions.append('Escrow below KES 100K')

    affiliate_ids = [row.get('affiliate_id') for row in conversion_rows if row.get('affiliate_id')]
    product_ids_for_names = [row.get('product_id') for row in conversion_rows if row.get('product_id')]
    affiliate_map = {}
    product_map = {}
    if affiliate_ids:
        affiliate_profiles = select(
            'profiles',
            params={'id': f"in.({','.join(affiliate_ids)})", 'select': 'id,full_name,business_name'},
        )
        affiliate_map = {row['id']: row for row in affiliate_profiles}
    if product_ids_for_names:
        recent_products = select(
            'products',
            params={'id': f"in.({','.join(product_ids_for_names)})", 'select': 'id,title'},
        )
        product_map = {row['id']: row for row in recent_products}

    formatted_transactions = []
    for row in conversion_rows:
        affiliate = affiliate_map.get(row.get('affiliate_id'), {})
        product = product_map.get(row.get('product_id'), {})
        formatted_transactions.append(
            {
                **row,
                'affiliate_name': affiliate.get('full_name') or affiliate.get('business_name') or row.get('affiliate_id'),
                'product_title': product.get('title') or row.get('product_id'),
            }
        )

    return {
        'stats': {
            'escrow_balance': escrow_balance,
            'reserved_balance': reserved_balance,
            'products': len(product_rows),
            'affiliates': len(link_rows),
            'sales_total': sales_total,
        },
        'pending_actions': pending_actions,
        'recent_transactions': formatted_transactions,
    }


@router.get('/escrow')
def escrow(user=Depends(get_current_user)):
    profile = require_role(user['id'], 'merchant')
    merchant_id = profile['id']
    escrow_rows = select('merchant_escrow', params={'merchant_id': f'eq.{merchant_id}', 'limit': 1})
    deposit_rows = select(
        'deposit_requests',
        params={
            'merchant_id': f'eq.{merchant_id}',
            'select': '*',
            'order': 'created_at.desc',
            'limit': 10,
        },
    )
    return {
        'balance': _to_number(escrow_rows[0].get('balance_kes')) if escrow_rows else 0.0,
        'reserved_balance': _to_number(escrow_rows[0].get('reserved_balance_kes')) if escrow_rows else 0.0,
        'deposits': deposit_rows,
    }


@router.post('/products')
def create_product(payload: ProductPayload, user=Depends(get_current_user)):
    profile = require_role(user['id'], 'merchant')
    record = {
        'merchant_id': profile['id'],
        'title': payload.title,
        'description': payload.description,
        'price_kes': payload.price_kes,
        'commission_percent': payload.commission_percent,
        'images': payload.images,
        'category': payload.category,
    }
    insert('products', record)
    return {'status': 'created'}


@router.post('/deposit')
def deposit(payload: DepositPayload, user=Depends(get_current_user)):
    profile = require_role(user['id'], 'merchant')
    insert(
        'deposit_requests',
        {
            'merchant_id': profile['id'],
            'amount_kes': payload.amount_kes,
            'mpesa_code': payload.mpesa_code,
            'screenshot_url': payload.screenshot_url,
            'status': 'pending',
        },
    )
    return {'status': 'submitted'}


@router.post('/products/{product_id}/record-sale')
def record_affiliate_sale(product_id: str, payload: ManualSalePayload, user=Depends(get_current_user)):
    profile = require_role(user['id'], 'merchant')
    ensure_active_plan(profile['id'], role='merchant', detail='Activate a merchant package in Settings before recording affiliate sales.')

    if product_id != payload.product_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Product selection mismatch.')
    if payload.sale_amount_kes <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Enter a valid sale amount.')
    if payload.quantity < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Quantity must be at least 1.')
    if not payload.customer_reference.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Enter a customer or order reference.')

    products = select(
        'products',
        params={
            'id': f'eq.{product_id}',
            'merchant_id': f'eq.{profile["id"]}',
            'is_active': 'eq.true',
            'moderation_status': 'eq.approved',
            'select': '*',
            'limit': 1,
        },
    )
    if not products:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Product not found or not eligible for affiliate sales.')
    product = products[0]

    link = get_link_by_code(payload.affiliate_code.strip().upper(), product_id=product_id)
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Affiliate code not found for this product.')
    if link.get('status') != 'active':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='This affiliate code is not active.')

    affiliate_profiles = select(
        'profiles',
        params={'id': f'eq.{link["affiliate_id"]}', 'role': 'eq.affiliate', 'select': '*', 'limit': 1},
    )
    if not affiliate_profiles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Affiliate profile not found.')
    affiliate = affiliate_profiles[0]
    if affiliate.get('affiliate_verification_status') != 'verified':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='The affiliate tied to this code is not verified yet.')

    affiliate_plans = select(
        'profile_plan_selections',
        params={'profile_id': f'eq.{affiliate["id"]}', 'role': 'eq.affiliate', 'status': 'eq.active', 'select': '*', 'limit': 1},
    )
    if not affiliate_plans:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='The affiliate tied to this code does not have an active package.')

    duplicate = select(
        'conversions',
        params={
            'merchant_id': f'eq.{profile["id"]}',
            'product_id': f'eq.{product_id}',
            'customer_reference': f'eq.{payload.customer_reference.strip()}',
            'select': 'id',
            'limit': 1,
        },
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='This customer or order reference has already been submitted.')

    order_value = payload.sale_amount_kes
    commission = round(order_value * _to_number(product.get('commission_percent')) / 100, 2)
    platform_fee = round(commission * 0.1, 2)
    reserve_merchant_commission(profile['id'], commission)

    try:
        created = insert(
            'conversions',
            {
                'link_id': link['id'],
                'affiliate_id': affiliate['id'],
                'merchant_id': profile['id'],
                'product_id': product_id,
                'order_value_kes': order_value,
                'commission_earned_kes': commission,
                'platform_fee_kes': platform_fee,
                'status': 'pending',
                'merchant_approved': True,
                'quantity': payload.quantity,
                'customer_reference': payload.customer_reference.strip(),
                'entry_mode': 'manual',
                'submitted_by': user['id'],
                'reserved_commission_kes': commission,
                'review_notes': payload.notes,
            },
        )
    except Exception:
        release_reserved_commission(profile['id'], commission)
        raise
    conversion = created[0] if isinstance(created, list) and created else None
    return {
        'status': 'submitted',
        'conversion': conversion,
        'commission_kes': commission,
        'platform_fee_kes': platform_fee,
        'affiliate_id': affiliate['id'],
        'affiliate_name': affiliate.get('full_name') or affiliate.get('business_name') or affiliate['id'],
    }
