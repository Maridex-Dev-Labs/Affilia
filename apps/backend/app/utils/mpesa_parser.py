import re

MPESA_CODE_RE = re.compile(r'[A-Z0-9]{8,12}')
AMOUNT_RE = re.compile(r'(?:KES|Ksh|Kshs)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)', re.IGNORECASE)


def parse_mpesa_message(text: str) -> dict[str, str | float | None]:
    code_match = MPESA_CODE_RE.search(text or '')
    amount_match = AMOUNT_RE.search(text or '')
    amount = None
    if amount_match:
        amount = float(amount_match.group(1).replace(',', ''))
    return {
        'mpesa_code': code_match.group(0) if code_match else None,
        'amount_kes': amount,
    }
