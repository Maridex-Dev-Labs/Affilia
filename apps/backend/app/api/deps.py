from fastapi import Header, HTTPException, status

from app.db.supabase import get_user_from_token, select

def get_current_user(authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing token')
    token = authorization.split('Bearer ')[1]
    try:
        user = get_user_from_token(token)
        return user
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')

def get_profile(user_id: str):
    profiles = select('profiles', params={'id': f'eq.{user_id}', 'limit': 1})
    return profiles[0] if profiles else None

def get_admin_record(user_id: str):
    admin_users = select(
        'admin_users',
        params={'user_id': f'eq.{user_id}', 'status': 'eq.active', 'limit': 1},
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
