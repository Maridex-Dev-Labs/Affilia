from pydantic import BaseModel


class ClickPayload(BaseModel):
    code: str
    ip: str | None = None
    userAgent: str | None = None
    referer: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
