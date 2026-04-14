from fastapi import APIRouter

router = APIRouter()


@router.post('/mpesa/manual')
def mpesa_manual_webhook():
    return {'status': 'accepted', 'mode': 'manual'}


@router.post('/notifications/test')
def notification_test_webhook():
    return {'status': 'accepted'}
