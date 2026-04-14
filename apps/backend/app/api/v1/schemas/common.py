from pydantic import BaseModel


class MessageResponse(BaseModel):
    status: str


class PaginationMeta(BaseModel):
    total: int
