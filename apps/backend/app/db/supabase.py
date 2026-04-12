import os

import httpx


SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SERVICE_ROLE = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

REST_URL = f"{SUPABASE_URL}/rest/v1"
AUTH_URL = f"{SUPABASE_URL}/auth/v1"


def _headers(token: str | None = None) -> dict[str, str]:
    return {
        "apikey": SERVICE_ROLE,
        "Authorization": f"Bearer {token or SERVICE_ROLE}",
        "Content-Type": "application/json",
    }


def get_user_from_token(token: str) -> dict:
    with httpx.Client(timeout=10.0) as client:
        response = client.get(f"{AUTH_URL}/user", headers=_headers(token))
        response.raise_for_status()
        return response.json()


def select(table: str, params: dict | None = None) -> list[dict]:
    with httpx.Client(timeout=10.0) as client:
        response = client.get(f"{REST_URL}/{table}", headers=_headers(), params=params)
        response.raise_for_status()
        return response.json()


def insert(table: str, payload: dict | list[dict]):
    with httpx.Client(timeout=10.0) as client:
        response = client.post(f"{REST_URL}/{table}", headers=_headers(), json=payload)
        response.raise_for_status()
        return response.json()


def update(table: str, payload: dict, params: dict):
    with httpx.Client(timeout=10.0) as client:
        response = client.patch(f"{REST_URL}/{table}", headers=_headers(), json=payload, params=params)
        response.raise_for_status()
        return response.json()


def rpc(function_name: str, payload: dict | None = None):
    with httpx.Client(timeout=10.0) as client:
        response = client.post(f"{REST_URL}/rpc/{function_name}", headers=_headers(), json=payload or {})
        response.raise_for_status()
        return response.json()
