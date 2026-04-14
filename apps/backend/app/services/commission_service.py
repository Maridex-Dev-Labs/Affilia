def calculate_percentage_commission(order_value_kes: float, commission_percent: float) -> float:
    return round(order_value_kes * (commission_percent / 100), 2)


def calculate_platform_fee(commission_amount_kes: float, fee_percent: float = 10.0) -> float:
    return round(commission_amount_kes * (fee_percent / 100), 2)
