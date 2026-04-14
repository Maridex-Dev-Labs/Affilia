import os
from typing import Iterable

from pydantic import BaseModel


def _csv_env(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


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
        if self.is_production and not self.SECRET_KEY:
            raise RuntimeError("SECRET_KEY must be set in production.")

    def origin_allowed(self, origin: str | None) -> bool:
        return not origin or origin in self.CORS_ALLOW_ORIGINS

    def iter_allowed_origins(self) -> Iterable[str]:
        return tuple(self.CORS_ALLOW_ORIGINS)

    def iter_trusted_hosts(self) -> Iterable[str]:
        return tuple(self.TRUSTED_HOSTS)


settings = Settings()
settings.validate_required()
