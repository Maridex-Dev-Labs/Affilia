from pydantic import BaseModel


class VerificationItem(BaseModel):
    id: str
    business_name: str | None = None
    full_name: str | None = None
    phone_number: str | None = None


class DepositApprovalItem(BaseModel):
    id: str
    merchant_id: str
    amount_kes: float
    status: str


class SweepPreview(BaseModel):
    total: float
    recipients: int
