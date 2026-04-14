from pydantic import BaseModel


class ReceiptSummary(BaseModel):
    id: str
    receipt_number: str
    amount_kes: float
    receipt_type: str
