from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user, get_profile
from app.db.supabase import update

router = APIRouter()


class ProfileUpdatePayload(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    phone_number: str | None = None
    business_name: str | None = None
    store_description: str | None = None


@router.get('/me')
def me(user=Depends(get_current_user)):
    return {'profile': get_profile(user['id'])}


@router.patch('/me')
def update_me(payload: ProfileUpdatePayload, user=Depends(get_current_user)):
    values = {key: value for key, value in payload.model_dump().items() if value is not None}
    if values:
        update('profiles', values, {'id': f'eq.{user["id"]}'})
    return {'status': 'updated'}
