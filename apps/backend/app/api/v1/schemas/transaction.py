from pydantic import BaseModel


class TransactionListResponse(BaseModel):
    items: list[dict]
