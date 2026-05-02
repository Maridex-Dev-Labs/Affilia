from fastapi import Header, HTTPException, status

from app.core.exceptions import UpstreamServiceError
from app.db.supabase import get_user_from_token, select

def get_current_user(authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing token')
    token = authorization.split('Bearer ')[1]
    try:
        user = get_user_from_token(token)
        return user
    except UpstreamServiceError:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')

def get_profile(user_id: str):
    profiles = select('profiles', params={'id': f'eq.{user_id}', 'limit': 1})
    return profiles[0] if profiles else None

def get_admin_record(user_id: str):
    admin_users = select(
        'admin_users',
        params={'user_id': f'eq.{user_id}', 'status': 'eq.active', 'select': '*', 'limit': 1},
    )
    return admin_users[0] if admin_users else None

def require_role(user_id: str, role: str):
    if role == 'admin':
        admin_record = get_admin_record(user_id)
        if not admin_record:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')
        return admin_record

    profile = get_profile(user_id)
    if not profile or profile.get('role') != role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Insufficient role')
    return profile


def require_admin_permission(user_id: str, permission_code: str):
    admin_record = require_role(user_id, 'admin')
    if admin_record.get('is_super_admin'):
        return admin_record

    role_rows = select(
        'admin_user_roles',
        params={'admin_user_id': f"eq.{admin_record['id']}", 'select': 'role_id'},
    )
    role_ids = [row.get('role_id') for row in role_rows if row.get('role_id')]
    if not role_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Missing admin permission')

    permission_rows = select(
        'admin_role_permissions',
        params={
            'role_id': f"in.({','.join(role_ids)})",
            'permission_code': f'eq.{permission_code}',
            'select': 'permission_code',
            'limit': 1,
        },
    )
    if not permission_rows:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Missing admin permission')

    return admin_record


def require_any_admin_permission(user_id: str, permission_codes: list[str]):
    last_error = None
    for permission_code in permission_codes:
        try:
            return require_admin_permission(user_id, permission_code)
        except HTTPException as exc:
            if exc.status_code != status.HTTP_403_FORBIDDEN:
                raise
            last_error = exc
    raise last_error or HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Missing admin permission')
