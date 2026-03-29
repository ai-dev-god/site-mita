"""Waitlist router — /api/v1/waitlist + /ws/waitlist.

REST routes (mounted at /api/v1/waitlist):
  POST /api/v1/waitlist/            — join queue (public, for QR self-join)
  GET  /api/v1/waitlist/?venue_id=X — list active entries (staff only)
  PATCH /api/v1/waitlist/{id}/status — seat, expire, or cancel entry (staff only)

WebSocket routes (mounted at /ws):
  WS /ws/waitlist/{venue_id}        — subscribe to live queue updates
"""

import asyncio
import json
import secrets
import uuid
from datetime import datetime, timezone
from typing import Annotated

import redis.asyncio as aioredis
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.encryption import encrypt_pii
from app.core.security import require_staff
from app.models.waitlist import WaitlistEntry, WaitlistStatus
from app.models.zone import Zone
from app.schemas.waitlist import WaitlistEntryCreate, WaitlistEntryRead, WaitlistEntryUpdate

logger = structlog.get_logger(__name__)
_settings = get_settings()

# REST router — included at /api/v1
router = APIRouter(prefix="/waitlist", tags=["waitlist"])
# WebSocket router — included at /ws
ws_router = APIRouter(tags=["waitlist-sync"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
StaffDep = Annotated[dict, Depends(require_staff)]


def _make_redis() -> aioredis.Redis:  # type: ignore[type-arg]
    return aioredis.from_url(str(_settings.redis_url), decode_responses=True)


def _channel(venue_id: uuid.UUID) -> str:
    return f"waitlist:{venue_id}"


def _to_dict(entry: WaitlistEntry) -> dict:  # type: ignore[type-arg]
    return {
        "id": str(entry.id),
        "venue_id": str(entry.venue_id),
        "zone_id": str(entry.zone_id),
        "guest_id": str(entry.guest_id) if entry.guest_id else None,
        "guest_name": entry.guest_name,
        "party_size": entry.party_size,
        "notes": entry.notes,
        "dietary_tags": entry.dietary_tags,
        "queue_position": entry.queue_position,
        "joined_at": entry.joined_at.isoformat(),
        "estimated_wait_minutes": entry.estimated_wait_minutes,
        "notified_at": entry.notified_at.isoformat() if entry.notified_at else None,
        "seated_at": entry.seated_at.isoformat() if entry.seated_at else None,
        "table_id": str(entry.table_id) if entry.table_id else None,
        "status": entry.status.value,
        "qr_token": entry.qr_token,
        "created_at": entry.created_at.isoformat(),
        "updated_at": entry.updated_at.isoformat(),
        "deleted_at": entry.deleted_at.isoformat() if entry.deleted_at else None,
    }


# ── REST ─────────────────────────────────────────────────────────────────────


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=WaitlistEntryRead,
    summary="Join walk-in queue",
)
async def join_queue(body: WaitlistEntryCreate, db: DbDep) -> WaitlistEntry:
    """Add a walk-in party to the queue.

    No authentication required — this is the public endpoint used by the
    QR self-join flow at /reserve/walkin.
    """
    zone = await db.scalar(select(Zone).where(Zone.id == body.zone_id))
    if zone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found.")

    # Next queue position = active count + 1
    active_count = (
        await db.scalar(
            select(func.count(WaitlistEntry.id)).where(
                and_(
                    WaitlistEntry.venue_id == body.venue_id,
                    WaitlistEntry.status.in_([WaitlistStatus.WAITING, WaitlistStatus.NOTIFIED]),
                    WaitlistEntry.deleted_at.is_(None),
                )
            )
        )
    ) or 0

    entry = WaitlistEntry(
        venue_id=body.venue_id,
        zone_id=body.zone_id,
        guest_id=body.guest_id,
        guest_name=body.guest_name,
        enc_guest_phone=encrypt_pii(body.phone) if body.phone else None,
        party_size=body.party_size,
        notes=body.notes,
        dietary_tags=body.dietary_tags,
        queue_position=active_count + 1,
        status=WaitlistStatus.WAITING,
        qr_token=secrets.token_urlsafe(32),
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)

    logger.info(
        "waitlist.joined",
        entry_id=str(entry.id),
        party_size=entry.party_size,
        position=entry.queue_position,
    )

    r = _make_redis()
    try:
        await r.publish(_channel(body.venue_id), json.dumps(_to_dict(entry)))
    finally:
        await r.aclose()

    return entry


@router.get(
    "",
    response_model=list[WaitlistEntryRead],
    summary="List active queue entries",
)
async def list_queue(
    db: DbDep,
    _: StaffDep,
    venue_id: Annotated[uuid.UUID, Query(description="Venue ID")],
) -> list[WaitlistEntry]:
    """Return active waitlist entries (waiting + notified) ordered by queue position."""
    result = await db.execute(
        select(WaitlistEntry)
        .where(
            and_(
                WaitlistEntry.venue_id == venue_id,
                WaitlistEntry.status.in_([WaitlistStatus.WAITING, WaitlistStatus.NOTIFIED]),
                WaitlistEntry.deleted_at.is_(None),
            )
        )
        .order_by(WaitlistEntry.queue_position)
    )
    return list(result.scalars().all())


@router.patch(
    "/{entry_id}/status",
    response_model=WaitlistEntryRead,
    summary="Update waitlist entry status",
)
async def update_entry_status(
    entry_id: uuid.UUID,
    body: WaitlistEntryUpdate,
    db: DbDep,
    _: StaffDep,
) -> WaitlistEntry:
    """Seat, notify, expire, or cancel a waitlist entry.

    Transitioning to ``notified`` fires an SMS to the guest.
    """
    result = await db.execute(
        select(WaitlistEntry).where(
            and_(
                WaitlistEntry.id == entry_id,
                WaitlistEntry.deleted_at.is_(None),
            )
        )
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist entry not found.")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(entry, field, value)

    if body.status == WaitlistStatus.NOTIFIED and entry.notified_at is None:
        entry.notified_at = datetime.now(tz=timezone.utc)
    elif body.status == WaitlistStatus.SEATED and entry.seated_at is None:
        entry.seated_at = datetime.now(tz=timezone.utc)

    await db.flush()
    await db.refresh(entry)

    logger.info("waitlist.status_updated", entry_id=str(entry_id), status=entry.status.value)

    if body.status == WaitlistStatus.NOTIFIED:
        from app.worker.tasks import notify_waitlist_ready  # avoid circular import
        notify_waitlist_ready.delay(str(entry.id))

    r = _make_redis()
    try:
        await r.publish(_channel(entry.venue_id), json.dumps(_to_dict(entry)))
    finally:
        await r.aclose()

    return entry


# ── WebSocket ─────────────────────────────────────────────────────────────────


@ws_router.websocket("/waitlist/{venue_id}")
async def waitlist_websocket(venue_id: uuid.UUID, websocket: WebSocket) -> None:
    """Subscribe to real-time waitlist-queue updates for a venue.

    Forwards every Redis pub/sub message on channel ``waitlist:{venue_id}``
    as a JSON text frame.  The client is responsible for reconnect on close.
    """
    await websocket.accept()
    logger.info("ws_waitlist_connected", venue_id=str(venue_id))

    r = _make_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe(_channel(venue_id))

    async def _forward() -> None:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])

    async def _watch_disconnect() -> None:
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass

    fwd = asyncio.create_task(_forward())
    disc = asyncio.create_task(_watch_disconnect())
    try:
        await asyncio.wait({fwd, disc}, return_when=asyncio.FIRST_COMPLETED)
    finally:
        fwd.cancel()
        disc.cancel()
        await asyncio.gather(fwd, disc, return_exceptions=True)
        await pubsub.unsubscribe(_channel(venue_id))
        await pubsub.aclose()
        await r.aclose()
        logger.info("ws_waitlist_disconnected", venue_id=str(venue_id))
