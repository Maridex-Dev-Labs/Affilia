from app.db.supabase import insert, rpc, select, update


def list_rows(table: str, params: dict | None = None) -> list[dict]:
    return select(table, params=params)


def get_row(table: str, params: dict) -> dict | None:
    rows = select(table, params={**params, 'limit': 1})
    return rows[0] if rows else None


def create_row(table: str, payload: dict):
    return insert(table, payload)


def update_rows(table: str, payload: dict, params: dict):
    return update(table, payload, params=params)


def call_rpc(function_name: str, payload: dict | None = None):
    return rpc(function_name, payload)
