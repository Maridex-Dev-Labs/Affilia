from pydantic import BaseModel


class MerchantDashboardStats(BaseModel):
    escrow_balance: float
    products: int
    affiliates: int
    sales_total: float


class DepositPayload(BaseModel):
    amount_kes: float
    mpesa_code: str | None = None
    screenshot_url: str | None = None
