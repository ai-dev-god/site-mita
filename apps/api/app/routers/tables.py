"""Tables REST + WebSocket floor-sync endpoints.

REST routes (mounted at /api/v1/tables):
  GET  /api/v1/tables?venue_id=X        — list all tables with zone name
  PATCH /api/v1/tables/{id}/status      — update status, broadcast via Redis

WebSocket routes (mounted at /ws):
  WS /ws/floor/{venue_id}               — subscribe to live table updates
"""

import asyncio
import json
import uuid
from typing import Annotated, Any

import redis.asyncio as aioredis
import structlog
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import require_staff
from app.models.table import Table
from app.models.venue import Venue
from app.models.zone import Zone
from app.schemas.table import TableFloorRead, TableStatusUpdate

logger = structlog.get_logger(__name__)
_settings = get_settings()

# REST router — included at /api/v1
router = APIRouter(prefix="/tables", tags=["tables"])
# WebSocket router — included at /ws
ws_router = APIRouter(tags=["floor-sync"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
StaffDep = Annotated[dict, Depends(require_staff)]


def _make_redis() -> aioredis.Redis:  # type: ignore[type-arg]
    return aioredis.from_url(str(_settings.redis_url), decode_responses=True)


def _channel(venue_id: uuid.UUID) -> str:
    return f"floor:{venue_id}"


def _to_dict(table: Table, zone_name: str) -> dict[str, Any]:
    return {
        "id": str(table.id),
        "zone_id": str(table.zone_id),
        "zone_name": zone_name,
        "label": table.label,
        "shape": table.shape.value,
        "status": table.status.value,
        "min_covers": table.min_covers,
        "max_covers": table.max_covers,
        "is_accessible": table.is_accessible,
        "is_outdoor": table.is_outdoor,
        "pos_x": float(table.pos_x) if table.pos_x is not None else None,
        "pos_y": float(table.pos_y) if table.pos_y is not None else None,
        "rotation": table.rotation,
    }


# ── REST ────────────────────────────────────────────────────────────────────


@router.get("", response_model=list[TableFloorRead], summary="List tables for a venue")
async def list_tables(
    venue_id: uuid.UUID,
    db: DbDep,
    _: StaffDep,
) -> list[dict[str, Any]]:
    """Return all active tables for a venue, enriched with zone name."""
    venue = await db.scalar(select(Venue).where(Venue.id == venue_id))
    if venue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found.")

    rows = (
        await db.execute(
            select(Table, Zone.name.label("zone_name"))
            .join(Zone, Table.zone_id == Zone.id)
            .where(Table.venue_id == venue_id, Table.deleted_at.is_(None))
            .order_by(Zone.name, Table.label)
        )
    ).all()
    return [_to_dict(r.Table, r.zone_name) for r in rows]


@router.patch(
    "/{table_id}/status",
    response_model=TableFloorRead,
    summary="Update table status",
)
async def update_table_status(
    table_id: uuid.UUID,
    body: TableStatusUpdate,
    db: DbDep,
    _: StaffDep,
) -> dict[str, Any]:
    """Set a new status on a table and broadcast the change via Redis pub/sub."""
    row = (
        await db.execute(
            select(Table, Zone.name.label("zone_name"))
            .join(Zone, Table.zone_id == Zone.id)
            .where(Table.id == table_id, Table.deleted_at.is_(None))
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found.")

    table, zone_name = row.Table, row.zone_name
    table.status = body.status
    await db.flush()

    payload = _to_dict(table, zone_name)

    r = _make_redis()
    try:
        await r.publish(_channel(table.venue_id), json.dumps(payload))
    finally:
        await r.aclose()

    logger.info("table_status_updated", table_id=str(table_id), status=body.status.value)
    return payload


# ── WebSocket ───────────────────────────────────────────────────────────────


@ws_router.websocket("/floor/{venue_id}")
async def floor_websocket(venue_id: uuid.UUID, websocket: WebSocket) -> None:
    """Subscribe to real-time table-status broadcasts for a venue.

    The server forwards every Redis pub/sub message on channel
    ``floor:{venue_id}`` as a JSON text frame.  The client is responsible
    for reconnect on close.
    """
    await websocket.accept()
    logger.info("ws_connected", venue_id=str(venue_id))

    r = _make_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe(_channel(venue_id))

    async def _forward() -> None:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])

    async def _watch_disconnect() -> None:
        """Drain client frames; returns when the client closes the connection."""
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
        logger.info("ws_disconnected", venue_id=str(venue_id))
