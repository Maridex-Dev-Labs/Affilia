import secrets


def generate_affiliate_code(prefix: str) -> str:
    return f"{prefix[:4]}-{secrets.token_hex(3)}".upper()
