from typing import TypedDict


class ProfileRecord(TypedDict, total=False):
    id: str
    full_name: str
    business_name: str
    role: str
    phone_number: str


class AdminRecord(TypedDict, total=False):
    id: str
    user_id: str
    email: str
    full_name: str
    status: str
    is_super_admin: bool


class ReceiptRecord(TypedDict, total=False):
    id: str
    receipt_number: str
    recipient_id: str
    amount_kes: float
