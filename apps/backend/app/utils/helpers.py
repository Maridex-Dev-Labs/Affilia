from datetime import datetime, timezone
from typing import Iterable


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def chunked(values: list, size: int) -> Iterable[list]:
    for index in range(0, len(values), size):
        yield values[index:index + size]
