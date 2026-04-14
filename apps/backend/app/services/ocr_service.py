from app.utils.mpesa_parser import parse_mpesa_message


def extract_mpesa_metadata(text: str) -> dict[str, str | float | None]:
    return parse_mpesa_message(text)
