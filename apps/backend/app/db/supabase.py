import logging

import httpx

from app.config import settings
from app.core.exceptions import UpstreamServiceError


REST_URL = f"{settings.SUPABASE_URL}/rest/v1"
AUTH_URL = f"{settings.SUPABASE_URL}/auth/v1"
logger = logging.getLogger(__name__)


def _headers(token: str | None = None) -> dict[str, str]:
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {token or settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _client() -> httpx.Client:
    timeout = httpx.Timeout(
        connect=min(settings.BACKEND_TIMEOUT_SECONDS, 5.0),
        read=max(settings.BACKEND_TIMEOUT_SECONDS, 15.0),
        write=max(settings.BACKEND_TIMEOUT_SECONDS, 15.0),
        pool=5.0,
    )
    transport = httpx.HTTPTransport(retries=2)
    return httpx.Client(timeout=timeout, transport=transport)


def _json_or_empty(response: httpx.Response):
    if not response.content or not response.content.strip():
        return []
    return response.json()


def _send(method: str, url: str, *, token: str | None = None, params: dict | None = None, payload: dict | list[dict] | None = None) -> httpx.Response:
    request_kwargs = {
        "headers": _headers(token),
        "params": params,
    }
    if payload is not None:
        request_kwargs["json"] = payload

    try:
        with _client() as client:
            response = client.request(method, url, **request_kwargs)
            response.raise_for_status()
            return response
    except httpx.TimeoutException as exc:
        logger.warning("Supabase request timed out: %s %s", method, url, exc_info=exc)
        raise UpstreamServiceError("Supabase is temporarily unavailable. Please retry shortly.") from exc
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "Supabase request failed with status %s for %s %s",
            exc.response.status_code,
            method,
            url,
            exc_info=exc,
        )
        if exc.response.status_code in {401, 403}:
            raise UpstreamServiceError("Supabase authorization failed for a backend service.", status_code=502) from exc
        raise UpstreamServiceError("Supabase returned an unexpected error. Please retry shortly.", status_code=502) from exc
    except httpx.HTTPError as exc:
        logger.warning("Supabase request failed: %s %s", method, url, exc_info=exc)
        raise UpstreamServiceError("Supabase is temporarily unavailable. Please retry shortly.") from exc


def get_user_from_token(token: str) -> dict:
    response = _send("GET", f"{AUTH_URL}/user", token=token)
    return response.json()


def select(table: str, params: dict | None = None) -> list[dict]:
    response = _send("GET", f"{REST_URL}/{table}", params=params)
    return _json_or_empty(response)


def insert(table: str, payload: dict | list[dict]):
    response = _send("POST", f"{REST_URL}/{table}", payload=payload)
    return _json_or_empty(response)


def update(table: str, payload: dict, params: dict):
    response = _send("PATCH", f"{REST_URL}/{table}", params=params, payload=payload)
    return _json_or_empty(response)


def delete(table: str, params: dict):
    response = _send("DELETE", f"{REST_URL}/{table}", params=params)
    return _json_or_empty(response)


def rpc(function_name: str, payload: dict | None = None):
    response = _send("POST", f"{REST_URL}/rpc/{function_name}", payload=payload or {})
    return _json_or_empty(response)


def auth_admin_delete_user(user_id: str) -> None:
    _send("DELETE", f"{AUTH_URL}/admin/users/{user_id}")
