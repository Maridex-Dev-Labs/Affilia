from app.db.crud.base import list_rows, update_rows


def list_conversions_for_merchant(merchant_id: str):
    return list_rows('conversions', {'merchant_id': f'eq.{merchant_id}', 'select': '*', 'order': 'created_at.desc'})


def approve_conversion(conversion_id: str):
    return update_rows('conversions', {'status': 'approved', 'merchant_approved': True}, {'id': f'eq.{conversion_id}'})
