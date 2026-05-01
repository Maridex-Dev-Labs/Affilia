from fastapi import APIRouter

from .endpoints import (
    admin,
    affiliates,
    auth,
    chat,
    contracts,
    forum,
    gamification,
    health,
    leaderboard,
    merchants,
    orders,
    products,
    receipts,
    tracking,
    transactions,
    users,
    webhooks,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix='/auth', tags=['Auth'])
api_router.include_router(merchants.router, prefix='/merchants', tags=['Merchants'])
api_router.include_router(affiliates.router, prefix='/affiliates', tags=['Affiliates'])
api_router.include_router(admin.router, prefix='/admin', tags=['Admin'])
api_router.include_router(users.router, prefix='/users', tags=['Users'])
api_router.include_router(products.router, prefix='/products', tags=['Products'])
api_router.include_router(orders.router, prefix='/orders', tags=['Orders'])
api_router.include_router(transactions.router, prefix='/transactions', tags=['Transactions'])
api_router.include_router(chat.router, prefix='/chat', tags=['Chat'])
api_router.include_router(contracts.router, prefix='/contracts', tags=['Contracts'])
api_router.include_router(forum.router, prefix='/forum', tags=['Forum'])
api_router.include_router(gamification.router, prefix='/gamification', tags=['Gamification'])
api_router.include_router(leaderboard.router, prefix='/leaderboard', tags=['Leaderboard'])
api_router.include_router(tracking.router, prefix='/track', tags=['Tracking'])
api_router.include_router(receipts.router, prefix='/receipts', tags=['Receipts'])
api_router.include_router(webhooks.router, prefix='/webhooks', tags=['Webhooks'])
api_router.include_router(health.router, prefix='/health', tags=['Health'])
