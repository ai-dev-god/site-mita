"""Analytics endpoints — /api/v1/analytics.

Aggregates reservation, guest, and zone data for the manager dashboard.
All queries scope to the date range [now - days, now].
"""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.guest import GuestProfile
from app.models.reservation import Reservation, ReservationStatus
from app.models.zone import Zone

router = APIRouter(prefix="/analytics", tags=["analytics"])

DbDep = Annotated[AsyncSession, Depends(get_db)]

_ACTIVE = [
    ReservationStatus.CONFIRMED,
    ReservationStatus.CHECKED_IN,
    ReservationStatus.COMPLETED,
]


def _window(days: int) -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    return now - timedelta(days=days), now


# ── KPIs ─────────────────────────────────────────────────────────────────────

@router.get("/kpis", summary="Aggregate KPI summary for a time window")
async def get_kpis(db: DbDep, days: int = Query(7, ge=1, le=365)) -> dict:
    start, end = _window(days)

    # Covers + reservation count
    res_row = (
        await db.execute(
            select(
                func.coalesce(func.sum(Reservation.party_size), 0),
                func.count(Reservation.id),
            ).where(
                and_(
                    Reservation.status.in_(_ACTIVE),
                    Reservation.reserved_at >= start,
                    Reservation.reserved_at <= end,
                    Reservation.deleted_at.is_(None),
                )
            )
        )
    ).one()
    total_covers = int(res_row[0])
    total_reservations = int(res_row[1])

    # Avg spend per cover (only from records that have an estimate)
    spend_row = (
        await db.execute(
            select(
                func.coalesce(func.sum(Reservation.estimated_spend_ron), 0),
                func.coalesce(func.sum(Reservation.party_size), 0),
            ).where(
                and_(
                    Reservation.estimated_spend_ron.isnot(None),
                    Reservation.reserved_at >= start,
                    Reservation.reserved_at <= end,
                    Reservation.deleted_at.is_(None),
                )
            )
        )
    ).one()
    total_spend = float(spend_row[0])
    spend_covers = int(spend_row[1])
    avg_spend_per_cover = round(total_spend / spend_covers, 2) if spend_covers > 0 else 0.0

    # No-show count (for occupancy %)
    no_shows = int(
        (
            await db.execute(
                select(func.count(Reservation.id)).where(
                    and_(
                        Reservation.status == ReservationStatus.NO_SHOW,
                        Reservation.reserved_at >= start,
                        Reservation.reserved_at <= end,
                        Reservation.deleted_at.is_(None),
                    )
                )
            )
        ).scalar()
        or 0
    )
    denominator = total_reservations + no_shows
    occupancy_pct = round(total_reservations / denominator * 100) if denominator > 0 else 0

    # New guests this period
    new_guests = int(
        (
            await db.execute(
                select(func.count(GuestProfile.id)).where(
                    and_(
                        GuestProfile.created_at >= start,
                        GuestProfile.deleted_at.is_(None),
                    )
                )
            )
        ).scalar()
        or 0
    )

    return {
        "days": days,
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "total_covers": total_covers,
        "total_reservations": total_reservations,
        "avg_spend_per_cover_ron": avg_spend_per_cover,
        "total_spend_ron": total_spend,
        "occupancy_pct": occupancy_pct,
        "no_shows": no_shows,
        "new_guests": new_guests,
    }


# ── Covers trend ──────────────────────────────────────────────────────────────

@router.get("/covers-trend", summary="Daily covers for the last N days")
async def get_covers_trend(
    db: DbDep,
    days: int = Query(7, ge=1, le=90),
) -> list[dict]:
    start, end = _window(days)

    rows = (
        await db.execute(
            select(
                func.date(Reservation.reserved_at).label("day"),
                func.coalesce(func.sum(Reservation.party_size), 0).label("covers"),
                func.count(Reservation.id).label("bookings"),
            ).where(
                and_(
                    Reservation.status.in_(_ACTIVE),
                    Reservation.reserved_at >= start,
                    Reservation.reserved_at <= end,
                    Reservation.deleted_at.is_(None),
                )
            )
            .group_by(func.date(Reservation.reserved_at))
            .order_by(func.date(Reservation.reserved_at))
        )
    ).all()

    return [
        {"day": str(row.day), "covers": int(row.covers), "bookings": int(row.bookings)}
        for row in rows
    ]


# ── Zone performance ──────────────────────────────────────────────────────────

@router.get("/zone-performance", summary="Covers and spend per zone")
async def get_zone_performance(
    db: DbDep,
    days: int = Query(7, ge=1, le=365),
) -> list[dict]:
    start, end = _window(days)

    rows = (
        await db.execute(
            select(
                Zone.id,
                Zone.name,
                Zone.slug,
                func.coalesce(func.sum(Reservation.party_size), 0).label("covers"),
                func.coalesce(func.sum(Reservation.estimated_spend_ron), 0).label("spend"),
            )
            .join(Reservation, Reservation.zone_id == Zone.id)
            .where(
                and_(
                    Reservation.status.in_(_ACTIVE),
                    Reservation.reserved_at >= start,
                    Reservation.reserved_at <= end,
                    Reservation.deleted_at.is_(None),
                )
            )
            .group_by(Zone.id, Zone.name, Zone.slug)
            .order_by(func.sum(Reservation.party_size).desc().nullslast())
        )
    ).all()

    return [
        {
            "zone_id": str(row.id),
            "zone_name": row.name,
            "zone_slug": row.slug,
            "covers": int(row.covers),
            "spend_ron": float(row.spend),
        }
        for row in rows
    ]


# ── Top guests ────────────────────────────────────────────────────────────────

@router.get("/top-guests", summary="Top guests by spend for the period")
async def get_top_guests(
    db: DbDep,
    days: int = Query(7, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
) -> list[dict]:
    start, end = _window(days)

    rows = (
        await db.execute(
            select(
                GuestProfile.id,
                GuestProfile.first_name,
                GuestProfile.last_name,
                GuestProfile.is_vip,
                GuestProfile.vip_tags,
                func.count(Reservation.id).label("visits"),
                func.coalesce(func.sum(Reservation.estimated_spend_ron), 0).label("spend"),
                func.max(Reservation.reserved_at).label("last_visit"),
            )
            .join(Reservation, Reservation.guest_id == GuestProfile.id)
            .where(
                and_(
                    Reservation.status.in_(_ACTIVE),
                    Reservation.reserved_at >= start,
                    Reservation.reserved_at <= end,
                    Reservation.deleted_at.is_(None),
                    GuestProfile.deleted_at.is_(None),
                )
            )
            .group_by(
                GuestProfile.id,
                GuestProfile.first_name,
                GuestProfile.last_name,
                GuestProfile.is_vip,
                GuestProfile.vip_tags,
            )
            .order_by(
                func.sum(Reservation.estimated_spend_ron).desc().nullslast(),
                func.count(Reservation.id).desc(),
            )
            .limit(limit)
        )
    ).all()

    return [
        {
            "guest_id": str(row.id),
            "name": f"{row.first_name or ''} {row.last_name or ''}".strip() or "Anonim",
            "is_vip": row.is_vip,
            "vip_tags": row.vip_tags or [],
            "visits": int(row.visits),
            "spend_ron": float(row.spend),
            "last_visit": row.last_visit.isoformat() if row.last_visit else None,
        }
        for row in rows
    ]
