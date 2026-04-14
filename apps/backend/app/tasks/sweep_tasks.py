from app.tasks.celery_app import celery_app
from app.services.payout_service import confirm_pending_payouts


@celery_app.task(name='sweep.confirm_pending')
def confirm_pending_payouts_task():
    return confirm_pending_payouts()
