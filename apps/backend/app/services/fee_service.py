def deposit_fee(amount_kes: float) -> float:
    if amount_kes < 100:
        return 0.0
    if amount_kes <= 500:
        return 10.0
    if amount_kes <= 1000:
        return 15.0
    if amount_kes <= 5000:
        return 40.0
    if amount_kes <= 25000:
        return 100.0
    return 250.0


def payout_fee(amount_kes: float) -> float:
    return max(15.0, round(amount_kes * 0.01, 2))
