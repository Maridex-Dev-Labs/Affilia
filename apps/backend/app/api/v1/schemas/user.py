from pydantic import BaseModel


class ProfileUpdatePayload(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    phone_number: str | None = None
    business_name: str | None = None
    store_description: str | None = None
