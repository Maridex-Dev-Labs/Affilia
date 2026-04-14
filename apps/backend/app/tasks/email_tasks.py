from app.tasks.celery_app import celery_app
from app.services.email_service import send_email


@celery_app.task(name='email.send')
def send_email_task(to_email: str, subject: str, body: str):
    return send_email(to_email, subject, body)
