from pydantic import BaseModel


class ProductCreatePayload(BaseModel):
    title: str
    description: str | None = None
    price_kes: float
    commission_percent: float
    images: list[str] = []
    category: str | None = None
