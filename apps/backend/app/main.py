from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import Response

from .config import settings
from .api.v1.router import api_router

app = FastAPI(
    title='Affilia API',
    version='1.0.0',
    docs_url='/api/docs' if settings.ENVIRONMENT == 'development' else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'https://affilia.co.ke',
        'https://admin.affilia.co.ke',
        'https://affilia.vercel.app',
        'https://sys-ctrl-ad-aff.vercel.app',
        'http://localhost:6100',
        'http://localhost:6200',
    ],
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PATCH', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type', 'apikey', 'x-client-info'],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=['api.affilia.co.ke', 'affilia-api.onrender.com', 'localhost', '127.0.0.1'],
)

@app.middleware('http')
async def add_security_headers(request, call_next):
    response: Response = await call_next(request)
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    if settings.ENVIRONMENT == 'production':
        response.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'
    return response

app.include_router(api_router, prefix='/api')
