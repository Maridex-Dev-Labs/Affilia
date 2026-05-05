from fastapi import APIRouter, HTTPException, status

from app.db.supabase import select

router = APIRouter()

PRODUCT_SELECT = 'id,merchant_id,title,description,price_kes,commission_percent,media,images,category,stock_status'
MERCHANT_SELECT = 'id,business_name,full_name,store_description,avatar_url'


@router.get('/marketplace')
def public_marketplace(limit: int = 24):
    items = select(
        'products',
        {
            'is_active': 'eq.true',
            'moderation_status': 'eq.approved',
            'select': PRODUCT_SELECT,
            'order': 'created_at.desc',
            'limit': min(max(limit, 1), 48),
        },
    )
    return {'items': items}


@router.get('/marketplace/products/{product_id}')
def public_product_detail(product_id: str):
    rows = select(
        'products',
        {
            'id': f'eq.{product_id}',
            'is_active': 'eq.true',
            'moderation_status': 'eq.approved',
            'select': PRODUCT_SELECT,
            'limit': 1,
        },
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Product not found')

    product = rows[0]
    merchant_rows = select(
        'profiles',
        {'id': f"eq.{product['merchant_id']}", 'role': 'eq.merchant', 'select': MERCHANT_SELECT, 'limit': 1},
    )
    merchant = merchant_rows[0] if merchant_rows else None

    related = []
    if product.get('category'):
        related = select(
            'products',
            {
                'is_active': 'eq.true',
                'moderation_status': 'eq.approved',
                'category': f"eq.{product['category']}",
                'id': f"neq.{product['id']}",
                'select': PRODUCT_SELECT,
                'order': 'created_at.desc',
                'limit': 6,
            },
        )
    if len(related) < 6:
        fallback = select(
            'products',
            {
                'is_active': 'eq.true',
                'moderation_status': 'eq.approved',
                'merchant_id': f"eq.{product['merchant_id']}",
                'id': f"neq.{product['id']}",
                'select': PRODUCT_SELECT,
                'order': 'created_at.desc',
                'limit': 6,
            },
        )
        seen = {item['id'] for item in related}
        for item in fallback:
            if item['id'] not in seen:
                related.append(item)
            if len(related) >= 6:
                break

    return {'product': product, 'merchant': merchant, 'related': related}


@router.get('/marketplace/shops/{merchant_id}')
def public_merchant_shop(merchant_id: str, limit: int = 24):
    merchant_rows = select('profiles', {'id': f'eq.{merchant_id}', 'role': 'eq.merchant', 'select': MERCHANT_SELECT, 'limit': 1})
    if not merchant_rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Merchant not found')

    products = select(
        'products',
        {
            'merchant_id': f'eq.{merchant_id}',
            'is_active': 'eq.true',
            'moderation_status': 'eq.approved',
            'select': PRODUCT_SELECT,
            'order': 'created_at.desc',
            'limit': min(max(limit, 1), 48),
        },
    )
    return {'merchant': merchant_rows[0], 'products': products}
