from app.config import settings


def allowed_origins() -> list[str]:
    return list(settings.iter_allowed_origins())


def trusted_hosts() -> list[str]:
    return list(settings.iter_trusted_hosts())
