from fastapi import APIRouter
from .endpoints import auth, merchants, affiliates, admin, tracking, receipts, health

api_router = APIRouter()
api_router.include_router(auth.router, prefix='/auth', tags=['Auth'])
api_router.include_router(merchants.router, prefix='/merchants', tags=['Merchants'])
api_router.include_router(affiliates.router, prefix='/affiliates', tags=['Affiliates'])
api_router.include_router(admin.router, prefix='/admin', tags=['Admin'])
api_router.include_router(tracking.router, prefix='/track', tags=['Tracking'])
api_router.include_router(receipts.router, prefix='/receipts', tags=['Receipts'])
api_router.include_router(health.router, prefix='/health', tags=['Health'])
