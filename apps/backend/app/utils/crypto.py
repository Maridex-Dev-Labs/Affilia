import hashlib
import secrets


def random_token(length: int = 32) -> str:
    return secrets.token_urlsafe(length)


def sha256_hexdigest(value: str) -> str:
    return hashlib.sha256(value.encode('utf-8')).hexdigest()
