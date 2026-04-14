from app.db.crud.base import list_rows


def list_user_achievements(user_id: str):
    return list_rows('user_achievements', {'user_id': f'eq.{user_id}', 'select': '*'})
