from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, get_profile
from app.db.supabase import select
from app.services.gamification_service import title_for_xp

router = APIRouter()


@router.get('/summary')
def gamification_summary(user=Depends(get_current_user)):
    profile = get_profile(user['id']) or {}
    achievements = select('user_achievements', {'user_id': f'eq.{user["id"]}', 'select': '*'})
    xp_points = int(profile.get('xp_points') or 0)
    return {
        'xp_points': xp_points,
        'title': title_for_xp(xp_points),
        'achievements': achievements,
    }
