from pydantic import BaseModel


class GamificationSummary(BaseModel):
    xp_points: int
    title: str
