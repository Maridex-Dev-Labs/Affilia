from app.db.crud.base import get_row, list_rows, update_rows


def get_profile(user_id: str):
    return get_row('profiles', {'id': f'eq.{user_id}', 'select': '*'})


def list_profiles(params: dict | None = None):
    return list_rows('profiles', params or {'select': '*'})


def update_profile(user_id: str, payload: dict):
    return update_rows('profiles', payload, {'id': f'eq.{user_id}'})
