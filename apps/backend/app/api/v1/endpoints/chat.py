from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.db.supabase import insert, select

router = APIRouter()


class ChatThreadPayload(BaseModel):
    member_ids: list[str]
    subject: str | None = None


class ChatMessagePayload(BaseModel):
    thread_id: str
    body: str
    media_url: str | None = None


@router.get('/threads')
def list_threads(user=Depends(get_current_user)):
    memberships = select('chat_thread_members', {'user_id': f'eq.{user["id"]}', 'select': 'thread_id'})
    thread_ids = [row.get('thread_id') for row in memberships if row.get('thread_id')]
    if not thread_ids:
        return {'items': []}
    items = select('chat_threads', {'id': f"in.({','.join(thread_ids)})", 'select': '*', 'order': 'updated_at.desc'})
    return {'items': items}


@router.post('/threads')
def create_thread(payload: ChatThreadPayload, user=Depends(get_current_user)):
    created = insert('chat_threads', {'created_by': user['id'], 'subject': payload.subject})
    thread = created[0] if isinstance(created, list) else created
    members = [{'thread_id': thread['id'], 'user_id': member_id} for member_id in set([user['id'], *payload.member_ids])]
    insert('chat_thread_members', members)
    return {'thread': thread}


@router.get('/messages/{thread_id}')
def list_messages(thread_id: str, user=Depends(get_current_user)):
    items = select('chat_messages', {'thread_id': f'eq.{thread_id}', 'select': '*', 'order': 'created_at.asc'})
    return {'items': items}


@router.post('/messages')
def create_message(payload: ChatMessagePayload, user=Depends(get_current_user)):
    created = insert('chat_messages', {'thread_id': payload.thread_id, 'sender_id': user['id'], 'body': payload.body, 'media_url': payload.media_url})
    return {'message': created[0] if isinstance(created, list) else created}
