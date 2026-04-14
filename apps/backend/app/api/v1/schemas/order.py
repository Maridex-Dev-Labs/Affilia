from pydantic import BaseModel


class OrderApprovalResponse(BaseModel):
    status: str
    conversion_id: str
