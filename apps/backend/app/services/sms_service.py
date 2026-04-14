def send_sms(phone_number: str, message: str) -> dict[str, str]:
    return {'status': 'queued', 'channel': 'sms', 'to': phone_number, 'message': message}
