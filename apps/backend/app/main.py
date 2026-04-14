from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import JSONResponse, Response

from .api.v1.router import api_router
from .config import settings
from .core.logging import configure_logging
from .middleware.cors import allowed_origins, trusted_hosts

configure_logging()

app = FastAPI(
    title="Affilia API",
    version="1.0.0",
    docs_url="/api/docs" if settings.docs_enabled else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=trusted_hosts(),
)


@app.middleware("http")
async def enforce_origin_allowlist(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin and not settings.origin_allowed(origin):
        return JSONResponse({"detail": "Origin not allowed."}, status_code=403)
    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return response


app.include_router(api_router, prefix="/api")
