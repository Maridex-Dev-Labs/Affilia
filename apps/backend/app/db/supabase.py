import httpx

from app.config import settings


REST_URL = f"{settings.SUPABASE_URL}/rest/v1"
AUTH_URL = f"{settings.SUPABASE_URL}/auth/v1"


def _headers(token: str | None = None) -> dict[str, str]:
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {token or settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def _client() -> httpx.Client:
    return httpx.Client(timeout=settings.BACKEND_TIMEOUT_SECONDS)


def get_user_from_token(token: str) -> dict:
    with _client() as client:
        response = client.get(f"{AUTH_URL}/user", headers=_headers(token))
        response.raise_for_status()
        return response.json()


def select(table: str, params: dict | None = None) -> list[dict]:
    with _client() as client:
        response = client.get(f"{REST_URL}/{table}", headers=_headers(), params=params)
        response.raise_for_status()
        return response.json()


def insert(table: str, payload: dict | list[dict]):
    with _client() as client:
        response = client.post(f"{REST_URL}/{table}", headers=_headers(), json=payload)
        response.raise_for_status()
        return response.json()


def update(table: str, payload: dict, params: dict):
    with _client() as client:
        response = client.patch(f"{REST_URL}/{table}", headers=_headers(), json=payload, params=params)
        response.raise_for_status()
        return response.json()


def rpc(function_name: str, payload: dict | None = None):
    with _client() as client:
        response = client.post(f"{REST_URL}/rpc/{function_name}", headers=_headers(), json=payload or {})
        response.raise_for_status()
        return response.json()
