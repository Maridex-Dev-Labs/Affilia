from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user, require_role
from app.db.supabase import insert, select

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

    pending_actions: list[str] = []
    if pending_orders:
        pending_actions.append(f'{pending_orders} orders awaiting approval')
    if low_stock:
        pending_actions.append(f'{low_stock} products low or out of stock')
    if escrow_balance < 100000:
        pending_actions.append('Escrow below KES 100K')

    return {
        'stats': {
            'escrow_balance': escrow_balance,
            'products': len(product_rows),
            'affiliates': len(link_rows),
            'sales_total': sales_total,
        },
        'pending_actions': pending_actions,
        'recent_transactions': conversion_rows,
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
