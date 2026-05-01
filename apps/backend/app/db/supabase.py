import httpx

from app.config import settings


REST_URL = f"{settings.SUPABASE_URL}/rest/v1"
AUTH_URL = f"{settings.SUPABASE_URL}/auth/v1"


def _headers(token: str | None = None) -> dict[str, str]:
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {token or settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _client() -> httpx.Client:
    return httpx.Client(timeout=settings.BACKEND_TIMEOUT_SECONDS)


def _json_or_empty(response: httpx.Response):
    if not response.content or not response.content.strip():
        return []
    return response.json()


def get_user_from_token(token: str) -> dict:
    with _client() as client:
        response = client.get(f"{AUTH_URL}/user", headers=_headers(token))
        response.raise_for_status()
        return response.json()


def select(table: str, params: dict | None = None) -> list[dict]:
    with _client() as client:
        response = client.get(f"{REST_URL}/{table}", headers=_headers(), params=params)
        response.raise_for_status()
        return _json_or_empty(response)


def insert(table: str, payload: dict | list[dict]):
    with _client() as client:
        response = client.post(f"{REST_URL}/{table}", headers=_headers(), json=payload)
        response.raise_for_status()
        return _json_or_empty(response)


def update(table: str, payload: dict, params: dict):
    with _client() as client:
        response = client.patch(f"{REST_URL}/{table}", headers=_headers(), json=payload, params=params)
        response.raise_for_status()
        return _json_or_empty(response)


def delete(table: str, params: dict):
    with _client() as client:
        response = client.delete(f"{REST_URL}/{table}", headers=_headers(), params=params)
        response.raise_for_status()
        return _json_or_empty(response)


def rpc(function_name: str, payload: dict | None = None):
    with _client() as client:
        response = client.post(f"{REST_URL}/rpc/{function_name}", headers=_headers(), json=payload or {})
        response.raise_for_status()
        return _json_or_empty(response)


def auth_admin_delete_user(user_id: str) -> None:
    with _client() as client:
        response = client.delete(f"{AUTH_URL}/admin/users/{user_id}", headers=_headers())
        response.raise_for_status()
