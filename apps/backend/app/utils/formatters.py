def format_currency_kes(amount: float | int) -> str:
    return f'KES {float(amount):,.2f}'


def mask_phone(phone: str | None) -> str:
    if not phone:
        return ''
    if len(phone) < 4:
        return phone
    return f"{phone[:4]}***{phone[-2:]}"
