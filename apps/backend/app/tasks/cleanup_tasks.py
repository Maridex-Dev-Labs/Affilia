from app.tasks.celery_app import celery_app


@celery_app.task(name='cleanup.noop')
def cleanup_noop_task():
    return {'status': 'ok'}
