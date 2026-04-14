from pydantic import BaseModel, EmailStr


class AuthMessage(BaseModel):
    detail: str


class ManagedAccountSeed(BaseModel):
    email: EmailStr
    temporary_password: str
