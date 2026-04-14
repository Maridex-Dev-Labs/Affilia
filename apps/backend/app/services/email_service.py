def send_email(to_email: str, subject: str, body: str) -> dict[str, str]:
    return {'status': 'queued', 'channel': 'email', 'to': to_email, 'subject': subject, 'body': body}
