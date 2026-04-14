from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.db.supabase import insert, select

router = APIRouter()


class ForumPostPayload(BaseModel):
    title: str
    content: str


class ForumCommentPayload(BaseModel):
    post_id: str
    body: str


@router.get('/posts')
def list_posts(user=Depends(get_current_user)):
    posts = select('forum_posts', {'select': '*', 'order': 'created_at.desc'})
    return {'items': posts}


@router.post('/posts')
def create_post(payload: ForumPostPayload, user=Depends(get_current_user)):
    created = insert('forum_posts', {'author_id': user['id'], 'title': payload.title, 'content': payload.content})
    return {'post': created[0] if isinstance(created, list) else created}


@router.get('/comments/{post_id}')
def list_comments(post_id: str, user=Depends(get_current_user)):
    comments = select('forum_comments', {'post_id': f'eq.{post_id}', 'select': '*', 'order': 'created_at.asc'})
    return {'items': comments}


@router.post('/comments')
def create_comment(payload: ForumCommentPayload, user=Depends(get_current_user)):
    created = insert('forum_comments', {'post_id': payload.post_id, 'author_id': user['id'], 'body': payload.body})
    return {'comment': created[0] if isinstance(created, list) else created}
