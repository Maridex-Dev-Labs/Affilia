from app.services.email_service import send_email
from app.services.sms_service import send_sms


def dispatch_notification(channel: str, recipient: str, subject: str, body: str):
    if channel == 'sms':
        return send_sms(recipient, body)
    return send_email(recipient, subject, body)
