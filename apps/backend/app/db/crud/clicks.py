from app.db.crud.base import create_row


def create_click_event(payload: dict):
    return create_row('click_events', payload)
