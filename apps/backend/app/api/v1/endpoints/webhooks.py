from fastapi import APIRouter, Header, HTTPException, status

from app.config import settings

router = APIRouter()


def _require_secret(provided_secret: str | None, configured_secret: str):
    if not configured_secret or provided_secret != configured_secret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Not found')


@router.post('/mpesa/manual')
def mpesa_manual_webhook(x_affilia_webhook_secret: str | None = Header(default=None)):
    _require_secret(x_affilia_webhook_secret, settings.MPESA_WEBHOOK_SECRET)
    return {'status': 'accepted', 'mode': 'manual'}


@router.post('/notifications/test')
def notification_test_webhook(x_affilia_webhook_secret: str | None = Header(default=None)):
    _require_secret(x_affilia_webhook_secret, settings.INTERNAL_WEBHOOK_SECRET)
    return {'status': 'accepted'}
