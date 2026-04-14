import re

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
PHONE_RE = re.compile(r'^(?:\+254|0)[17][0-9]{8}$')
MPESA_RE = re.compile(r'^[A-Z0-9]{8,12}$')


def is_valid_email(value: str | None) -> bool:
    return bool(value and EMAIL_RE.match(value))


def is_valid_phone(value: str | None) -> bool:
    return bool(value and PHONE_RE.match(value))


def is_valid_mpesa_code(value: str | None) -> bool:
    return bool(value and MPESA_RE.match(value))


def require_positive_amount(value: float) -> None:
    if value <= 0:
        raise ValueError('Amount must be greater than zero.')
