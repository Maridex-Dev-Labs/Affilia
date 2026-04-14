from app.db.crud.base import create_row, get_row, list_rows, update_rows


def list_public_products():
    return list_rows('products', {'is_active': 'eq.true', 'moderation_status': 'eq.approved', 'select': '*'})


def get_product(product_id: str):
    return get_row('products', {'id': f'eq.{product_id}', 'select': '*'})


def create_product(payload: dict):
    return create_row('products', payload)


def update_product(product_id: str, payload: dict):
    return update_rows('products', payload, {'id': f'eq.{product_id}'})
