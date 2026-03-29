"""Occupancy endpoints — /api/v1/occupancy.

Exposes live and historical headcount data sourced from UniFi Protect cameras.
All reads are from the ``occupancy_events`` TimescaleDB hypertable.

Routes
------
GET  /api/v1/occupancy/live        — latest headcount per zone
GET  /api/v1/occupancy/history     — time-bucketed headcount over a window
POST /api/v1/occupancy/ingest      — internal: push a manual snapshot (admin only)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin, require_staff
from app.models.occupancy import OccupancyEvent
from app.models.zone import Zone

router = APIRouter(prefix="/occupancy", tags=["occupancy"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


# ── Live occupancy ────────────────────────────────────────────────────────────

@router.get("/live", summary="Latest headcount per zone from camera analytics")
async def get_live_occupancy(
    db: DbDep,
    venue_id: uuid.UUID = Query(..., description="Venue UUID"),
    _claims: dict = Depends(require_staff),
) -> list[dict]:
    """Return the most recent occupancy snapshot for every zone that has data.

    For each zone we pick the single most recent ``occupancy_events`` row.
    If cameras are not yet configured, returns an empty list.
    """
    # Subquery: latest `time` per zone for this venue
    latest_subq = (
        select(
            OccupancyEvent.zone_id,
            func.max(OccupancyEvent.time).label("latest_time"),
        )
        .where(
            and_(
                OccupancyEvent.venue_id == venue_id,
                OccupancyEvent.zone_id.isnot(None),
            )
        )
        .group_by(OccupancyEvent.zone_id)
        .subquery()
    )

    rows = (
        await db.execute(
            select(
                OccupancyEvent.zone_id,
                OccupancyEvent.headcount,
                OccupancyEvent.time,
                OccupancyEvent.source,
                Zone.name.label("zone_name"),
                Zone.slug.label("zone_slug"),
                Zone.total_capacity,
            )
            .join(
                latest_subq,
                and_(
                    OccupancyEvent.zone_id == latest_subq.c.zone_id,
                    OccupancyEvent.time == latest_subq.c.latest_time,
                ),
            )
            .join(Zone, Zone.id == OccupancyEvent.zone_id, isouter=True)
            .where(OccupancyEvent.venue_id == venue_id)
            .order_by(Zone.name.nullslast())
        )
    ).all()

    return [
        {
            "zone_id": str(row.zone_id),
            "zone_name": row.zone_name,
            "zone_slug": row.zone_slug,
            "headcount": row.headcount,
            "capacity": row.total_capacity,
            "pct_capacity": (
                round(row.headcount / row.total_capacity * 100)
                if row.total_capacity and row.total_capacity > 0
                else None
            ),
            "last_updated": row.time.isoformat(),
            "source": row.source,
        }
        for row in rows
    ]


# ── Historical occupancy ──────────────────────────────────────────────────────

@router.get("/history", summary="Time-bucketed headcount over a window")
async def get_occupancy_history(
    db: DbDep,
    venue_id: uuid.UUID = Query(..., description="Venue UUID"),
    zone_id: uuid.UUID | None = Query(None, description="Filter to a single zone"),
    minutes: int = Query(60, ge=5, le=1440, description="Lookback window in minutes"),
    bucket_minutes: int = Query(5, ge=1, le=60, description="Bucket size in minutes"),
    _claims: dict = Depends(require_staff),
) -> list[dict]:
    """Return average headcount grouped into time buckets.

    Uses TimescaleDB ``time_bucket`` when available; falls back to a plain
    PostgreSQL ``date_trunc``-style expression for compatibility.
    """
    start = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    bucket_interval = f"{bucket_minutes} minutes"

    zone_filter = [
        OccupancyEvent.venue_id == venue_id,
        OccupancyEvent.time >= start,
    ]
    if zone_id is not None:
        zone_filter.append(OccupancyEvent.zone_id == zone_id)

    # Use TimescaleDB time_bucket for even bucket boundaries
    bucket_expr = func.time_bucket(text(f"interval '{bucket_interval}'"), OccupancyEvent.time)

    rows = (
        await db.execute(
            select(
                bucket_expr.label("bucket"),
                OccupancyEvent.zone_id,
                func.avg(OccupancyEvent.headcount).label("avg_headcount"),
                func.max(OccupancyEvent.headcount).label("max_headcount"),
            )
            .where(and_(*zone_filter))
            .group_by(bucket_expr, OccupancyEvent.zone_id)
            .order_by(bucket_expr)
        )
    ).all()

    return [
        {
            "bucket": row.bucket.isoformat(),
            "zone_id": str(row.zone_id) if row.zone_id else None,
            "avg_headcount": round(float(row.avg_headcount), 1),
            "max_headcount": int(row.max_headcount),
        }
        for row in rows
    ]


# ── Manual ingest (admin override) ───────────────────────────────────────────

@router.post("/ingest", summary="Push a manual occupancy snapshot (admin only)", status_code=201)
async def ingest_occupancy(
    db: DbDep,
    venue_id: uuid.UUID = Query(...),
    zone_id: uuid.UUID = Query(...),
    headcount: int = Query(..., ge=0),
    _claims: dict = Depends(require_admin),
) -> dict:
    """Allows an admin to manually correct occupancy when cameras are offline."""
    event = OccupancyEvent(
        id=uuid.uuid4(),
        time=datetime.now(timezone.utc),
        venue_id=venue_id,
        zone_id=zone_id,
        headcount=headcount,
        source="manual",
    )
    db.add(event)
    await db.commit()
    return {"id": str(event.id), "time": event.time.isoformat(), "headcount": headcount}
