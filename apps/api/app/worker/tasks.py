"""Celery tasks for guest notification delivery (SMS via Twilio, email via Resend)."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import structlog

from app.worker.celery_app import celery_app

logger = structlog.get_logger(__name__)


# ── helpers ────────────────────────────────────────────────────────────────────

def _run(coro):  # type: ignore[no-untyped-def]
    """Run an async coroutine from a sync Celery task."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ── per-reservation tasks ──────────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=3, default_retry_delay=30, name="app.worker.tasks.notify_confirmed")
def notify_confirmed(self, reservation_id: str) -> None:  # type: ignore[no-untyped-def]
    """Send confirmation SMS + email immediately after a reservation is created."""
    from app.services.notifications import _deliver_confirmation  # local import avoids circular deps
    try:
        _run(_deliver_confirmation(uuid.UUID(reservation_id)))
    except Exception as exc:
        logger.exception("notify_confirmed.failed", reservation_id=reservation_id, exc=str(exc))
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30, name="app.worker.tasks.notify_cancelled")
def notify_cancelled(self, reservation_id: str) -> None:  # type: ignore[no-untyped-def]
    """Send cancellation notification SMS + email."""
    from app.services.notifications import _deliver_cancellation
    try:
        _run(_deliver_cancellation(uuid.UUID(reservation_id)))
    except Exception as exc:
        logger.exception("notify_cancelled.failed", reservation_id=reservation_id, exc=str(exc))
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60, name="app.worker.tasks.notify_reminder")
def notify_reminder(self, reservation_id: str) -> None:  # type: ignore[no-untyped-def]
    """Send 24h reminder SMS + email. Scheduled via ETA by sweep_upcoming_reminders."""
    from app.services.notifications import _deliver_reminder
    try:
        _run(_deliver_reminder(uuid.UUID(reservation_id)))
    except Exception as exc:
        logger.exception("notify_reminder.failed", reservation_id=reservation_id, exc=str(exc))
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30, name="app.worker.tasks.notify_waitlist_ready")
def notify_waitlist_ready(self, entry_id: str) -> None:  # type: ignore[no-untyped-def]
    """Send 'table ready' SMS to a walk-in guest when notified status is set."""
    from app.services.notifications import _deliver_waitlist_ready
    try:
        _run(_deliver_waitlist_ready(uuid.UUID(entry_id)))
    except Exception as exc:
        logger.exception("notify_waitlist_ready.failed", entry_id=entry_id, exc=str(exc))
        raise self.retry(exc=exc)


# ── beat sweep ─────────────────────────────────────────────────────────────────

@celery_app.task(name="app.worker.tasks.sweep_upcoming_reminders")
def sweep_upcoming_reminders() -> None:  # type: ignore[no-untyped-def]
    """Celery Beat task: find reservations in the next 24–25h window and dispatch reminders.

    Runs every 5 minutes. Using a 25h window with reminder_sent guard prevents double-sends.
    """
    _run(_sweep())


async def _sweep() -> None:
    from sqlalchemy import and_, select
    from app.core.database import AsyncSessionLocal
    from app.models.reservation import Reservation, ReservationStatus

    now = datetime.now(tz=timezone.utc)
    window_start = now + timedelta(hours=24)
    window_end = now + timedelta(hours=25)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Reservation).where(
                and_(
                    Reservation.reserved_at >= window_start,
                    Reservation.reserved_at < window_end,
                    Reservation.status == ReservationStatus.CONFIRMED,
                    Reservation.reminder_sent_at.is_(None),
                    Reservation.deleted_at.is_(None),
                )
            )
        )
        reservations = result.scalars().all()

    for res in reservations:
        notify_reminder.delay(str(res.id))
        logger.info("reminder.scheduled", reservation_id=str(res.id), reserved_at=str(res.reserved_at))
