from pydantic import BaseModel


class AffiliateDashboard(BaseModel):
    today: float
    total: float
    links: int
    clicks: int
    rank: int | None = None
    leaderboard_total: int


class GenerateLinkPayload(BaseModel):
    product_id: str
