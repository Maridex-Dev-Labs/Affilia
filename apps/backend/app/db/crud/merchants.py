from app.db.crud.base import list_rows


def list_merchant_products(merchant_id: str):
    return list_rows('products', {'merchant_id': f'eq.{merchant_id}', 'select': '*'})


def list_merchant_deposits(merchant_id: str):
    return list_rows('deposit_requests', {'merchant_id': f'eq.{merchant_id}', 'select': '*', 'order': 'created_at.desc'})
