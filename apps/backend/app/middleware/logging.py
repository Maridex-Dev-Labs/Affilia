import time
from starlette.requests import Request

from app.core.logging import get_logger

logger = get_logger(__name__)


async def log_request_timing(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
    logger.info('%s %s -> %s (%sms)', request.method, request.url.path, response.status_code, elapsed_ms)
    return response
