import os
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

from pydantic import BaseModel
from dotenv import load_dotenv


BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")


def _csv_env(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _parsed_origin(value: str | None) -> tuple[str, str | None, int | None] | None:
    if not value:
        return None
    parsed = urlparse(value)
    if not parsed.scheme or not parsed.hostname:
        return None
    return (parsed.scheme.lower(), parsed.hostname.lower(), parsed.port)


class Settings(BaseModel):
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").rstrip("/")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    OCR_SPACE_API_KEY: str = os.getenv("OCR_SPACE_API_KEY", "")
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    APP_URL: str = os.getenv("APP_URL", "http://localhost:6100")
    ADMIN_URL: str = os.getenv("ADMIN_URL", "http://localhost:6200")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    BACKEND_TIMEOUT_SECONDS: float = float(os.getenv("BACKEND_TIMEOUT_SECONDS", "10"))
    CORS_ALLOW_ORIGINS: list[str] = _csv_env(
        "CORS_ALLOW_ORIGINS",
        "https://affilia.co.ke,https://admin.affilia.co.ke,https://affilia.vercel.app,https://sys-ctrl-ad-aff.vercel.app,http://localhost:6100,http://localhost:6200",
    )
    TRUSTED_HOSTS: list[str] = _csv_env(
        "TRUSTED_HOSTS",
        "api.affilia.co.ke,affilia-api.onrender.com,localhost,127.0.0.1",
    )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def docs_enabled(self) -> bool:
        return not self.is_production and os.getenv("ENABLE_DOCS", "true").lower() == "true"

    def validate_required(self) -> None:
        required = {
            "SUPABASE_URL": self.SUPABASE_URL,
            "SUPABASE_SERVICE_ROLE_KEY": self.SUPABASE_SERVICE_ROLE_KEY,
        }
        missing = [key for key, value in required.items() if not value]
        if missing:
            raise RuntimeError(f"Missing required backend env vars: {', '.join(missing)}")
        if self.is_production and (not self.SECRET_KEY or self.SECRET_KEY.strip().lower() in {"change-me", "secret", "dev-secret"}):
            raise RuntimeError("SECRET_KEY must be set to a non-default value in production.")

    def origin_allowed(self, origin: str | None) -> bool:
        if not origin:
            return True
        if origin in self.CORS_ALLOW_ORIGINS:
            return True

        parsed_origin = _parsed_origin(origin)
        if not parsed_origin:
            return False

        if not self.is_production and parsed_origin[1] in {"localhost", "127.0.0.1"}:
            return True

        for candidate in self.CORS_ALLOW_ORIGINS:
            parsed_candidate = _parsed_origin(candidate)
            if not parsed_candidate:
                continue
            same_scheme = parsed_candidate[0] == parsed_origin[0]
            same_port = parsed_candidate[2] == parsed_origin[2]
            loopback_pair = {parsed_candidate[1], parsed_origin[1]} <= {"localhost", "127.0.0.1"}
            if same_scheme and same_port and loopback_pair:
                return True
        return False

    def iter_allowed_origins(self) -> Iterable[str]:
        origins = list(dict.fromkeys(self.CORS_ALLOW_ORIGINS))
        if not self.is_production:
            dev_pairs = []
            for origin in origins:
                parsed = _parsed_origin(origin)
                if not parsed or parsed[1] not in {"localhost", "127.0.0.1"} or parsed[2] is None:
                    continue
                alternate_host = "127.0.0.1" if parsed[1] == "localhost" else "localhost"
                dev_pairs.append(f"{parsed[0]}://{alternate_host}:{parsed[2]}")
            origins.extend(dev_pairs)
        return tuple(dict.fromkeys(origins))

    def iter_trusted_hosts(self) -> Iterable[str]:
        return tuple(self.TRUSTED_HOSTS)


settings = Settings()
settings.validate_required()
