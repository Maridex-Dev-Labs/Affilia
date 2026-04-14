from pydantic import BaseModel


class ChatThreadPayload(BaseModel):
    member_ids: list[str]
    subject: str | None = None


class ChatMessagePayload(BaseModel):
    thread_id: str
    body: str
    media_url: str | None = None
