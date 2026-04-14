from app.tasks.celery_app import celery_app
from app.services.ocr_service import extract_mpesa_metadata


@celery_app.task(name='ocr.extract_mpesa')
def extract_mpesa_metadata_task(text: str):
    return extract_mpesa_metadata(text)
