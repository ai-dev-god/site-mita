"""Celery application singleton for LMBSC background jobs."""

from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "lmbsc",
    broker=str(settings.redis_url),
    backend=str(settings.redis_url),
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Europe/Bucharest",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Celery Beat: run the daily reminder sweep every minute (checks DB for due reminders)
    beat_schedule={
        "sweep-24h-reminders": {
            "task": "app.worker.tasks.sweep_upcoming_reminders",
            "schedule": crontab(minute="*/5"),  # every 5 min
        },
    },
)
