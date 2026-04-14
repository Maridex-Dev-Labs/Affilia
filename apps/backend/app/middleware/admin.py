from app.api.deps import require_admin_permission


def enforce_admin_permission(user_id: str, permission_code: str):
    return require_admin_permission(user_id, permission_code)
