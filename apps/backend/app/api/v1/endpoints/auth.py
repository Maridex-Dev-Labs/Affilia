from fastapi import APIRouter, HTTPException, status

router = APIRouter()

def _not_implemented():
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail='Authentication is handled by Supabase Auth directly. This backend endpoint is disabled.',
    )

@router.post('/register')
def register():
    _not_implemented()

@router.post('/login')
def login():
    _not_implemented()

@router.post('/social/google')
def google_oauth():
    _not_implemented()

@router.post('/social/microsoft')
def microsoft_oauth():
    _not_implemented()
