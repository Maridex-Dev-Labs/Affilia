from fastapi import Header


def extract_bearer_token(authorization: str | None = Header(None)) -> str | None:
    if not authorization or not authorization.startswith('Bearer '):
        return None
    return authorization.split('Bearer ', 1)[1].strip()
