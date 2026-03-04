from celery import Celery
from celery.utils.log import get_task_logger
from utils.report_generator import generate_pdf_report
from utils.notifications import notify_user
import os

celery = Celery('tasks',
                broker=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
                backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'))

logger = get_task_logger(__name__)

@celery.task
def generate_pdf_async(diagnosis_record, diagnosis_id):
    """Generate PDF report asynchronously."""
    try:
        pdf_path = generate_pdf_report(diagnosis_record, diagnosis_id, './reports')
        logger.info(f"PDF generated: {pdf_path}")
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")

@celery.task
def notify_user_task(case_id, action):
    """Notify user about consultation status."""
    # In production, send email/SMS
    logger.info(f"Notify user for case {case_id} with action {action}")
    # notify_user(...)