from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.services.gamification_service import get_leaderboard

router = APIRouter()


@router.get('')
def leaderboard(user=Depends(get_current_user)):
    return {'items': get_leaderboard(50) or []}
