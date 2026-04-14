from celery import Celery

from app.config import settings

redis_url = settings.REDIS_URL

celery_app = Celery(
    'affilia',
    broker=redis_url,
    backend=redis_url,
    include=[
        'app.tasks.email_tasks',
        'app.tasks.ocr_tasks',
        'app.tasks.sweep_tasks',
        'app.tasks.cleanup_tasks',
    ],
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Africa/Nairobi',
    enable_utc=True,
)
