from app.api.deps import get_admin_record, get_profile


def get_user_profile(user_id: str):
    return get_profile(user_id)


def get_active_admin(user_id: str):
    return get_admin_record(user_id)
