from app.db.crud.base import create_row, list_rows


def log_admin_action(payload: dict):
    return create_row('admin_audit_log', payload)


def list_admin_actions():
    return list_rows('admin_audit_log', {'select': '*', 'order': 'created_at.desc'})
