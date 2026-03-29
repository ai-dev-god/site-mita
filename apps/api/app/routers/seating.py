"""Seating suggestion router — POST /api/v1/seating/suggest.

Deterministic heuristic scorer that ranks available tables for a reservation
context. Scoring factors (each 0.0–1.0, combined into a weighted total):

  1. Party size fit     — prefer the tightest adequate fit (min waste)
  2. Section balance    — prefer under-utilised zones (spread load)
  3. VIP placement      — VIP guests → premium zones (SALON_ISTORIC first)
  4. Turn-time proxy    — smaller tables / faster shapes turn quicker
  5. Revenue per cover  — use estimated_spend_ron when provided; else neutral
"""

import uuid
from datetime import datetime, timedelta
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_staff
from app.models.guest import GuestProfile
from app.models.reservation import Reservation, ReservationStatus
from app.models.table import Table, TableShape, TableStatus
from app.models.zone import Zone, ZoneType
from app.services.availability import BLOCKING_STATUSES

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/seating", tags=["seating"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
StaffDep = Annotated[dict, Depends(require_staff)]

# ── Scoring weights (must sum to 1.0) ─────────────────────────────────────────

_W_SIZE_FIT = 0.30
_W_SECTION_BALANCE = 0.20
_W_VIP_PLACEMENT = 0.20
_W_TURN_TIME = 0.15
_W_REVENUE = 0.15

# Shapes that tend to turn over faster (smaller/solo seating)
_FAST_SHAPES: set[TableShape] = {TableShape.BAR, TableShape.ROUND}

# Zone types considered "premium" for VIP placement (in preference order)
_PREMIUM_ZONE_TYPES: list[ZoneType] = [ZoneType.SALON_ISTORIC]


# ── Schemas ────────────────────────────────────────────────────────────────────


class SeatingSuggestRequest(BaseModel):
    zone_id: uuid.UUID = Field(description="Zone to search tables within")
    reserved_at: datetime = Field(description="Requested reservation start (UTC)")
    party_size: int = Field(ge=1, le=20)
    duration_minutes: int = Field(default=90, ge=30, le=360)
    guest_id: uuid.UUID | None = Field(default=None, description="Guest profile ID for VIP lookup")
    is_vip: bool = Field(default=False, description="Override VIP flag (used when guest_id is absent)")
    estimated_spend_ron: float | None = Field(default=None, ge=0, description="Expected total spend; improves revenue scoring")


class ScoreBreakdown(BaseModel):
    size_fit: float
    section_balance: float
    vip_placement: float
    turn_time: float
    revenue: float
    total: float


class TableSuggestion(BaseModel):
    table_id: uuid.UUID
    label: str
    zone_id: uuid.UUID
    shape: str
    min_covers: int
    max_covers: int
    is_accessible: bool
    is_outdoor: bool
    score: float
    score_breakdown: ScoreBreakdown


class SeatingSuggestResponse(BaseModel):
    suggestions: list[TableSuggestion]
    total_candidates: int


# ── Scorer ─────────────────────────────────────────────────────────────────────


def _score_size_fit(table: Table, party_size: int) -> float:
    """Prefer the smallest adequate table to minimise wasted seats."""
    capacity_range = table.max_covers - table.min_covers
    if capacity_range <= 0:
        return 1.0
    waste = table.max_covers - party_size
    return max(0.0, 1.0 - waste / capacity_range)


def _score_section_balance(table: Table, zone_load: dict[uuid.UUID, int], max_load: int) -> float:
    """Prefer zones with fewer current reservations (normalised load)."""
    if max_load == 0:
        return 1.0
    load = zone_load.get(table.zone_id, 0)
    return 1.0 - load / max_load


def _score_vip_placement(table: Table, zone_type: ZoneType, is_vip: bool) -> float:
    """VIP guests score highest in premium zones; non-VIP guests get neutral score."""
    if not is_vip:
        return 0.5  # neutral — don't penalise non-VIP for zone type
    if zone_type in _PREMIUM_ZONE_TYPES:
        idx = _PREMIUM_ZONE_TYPES.index(zone_type)
        return 1.0 - idx * 0.2  # first premium zone = 1.0, second = 0.8, etc.
    return 0.1  # non-premium zone for VIP guest = low score


def _score_turn_time(table: Table) -> float:
    """Proxy: smaller max capacity + fast shapes turn over quicker."""
    shape_bonus = 0.3 if table.shape in _FAST_SHAPES else 0.0
    # Normalise capacity: 2-cover table = 1.0, 12-cover = 0.0
    cap_score = max(0.0, 1.0 - (table.max_covers - 2) / 10)
    return min(1.0, cap_score * 0.7 + shape_bonus)


def _score_revenue(table: Table, estimated_spend_ron: float | None) -> float:
    """When spend is provided, favour tables matching higher revenue per cover.

    Without spend data we return 0.5 (neutral) so it doesn't skew results.
    """
    if estimated_spend_ron is None:
        return 0.5
    spend_per_cover = estimated_spend_ron / max(table.min_covers, 1)
    # Normalise: <50 RON/cover = 0.2, ~250 RON/cover = 1.0
    return min(1.0, max(0.2, spend_per_cover / 250))


# ── Endpoint ───────────────────────────────────────────────────────────────────


@router.post(
    "/suggest",
    response_model=SeatingSuggestResponse,
    summary="Suggest ranked table assignments for a reservation",
)
async def suggest_seating(
    body: SeatingSuggestRequest,
    db: DbDep,
    _staff: StaffDep,
) -> SeatingSuggestResponse:
    """Return a ranked list of available tables for the given reservation context.

    The host can pick any suggestion or override manually. The top suggestion
    is suitable for auto-assignment in the reservation confirmation flow.
    """
    # Resolve VIP flag from guest profile when guest_id is provided
    is_vip = body.is_vip
    if body.guest_id:
        guest = await db.get(GuestProfile, body.guest_id)
        if guest is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found")
        is_vip = guest.is_vip or is_vip

    # Load zone for type metadata
    zone = await db.get(Zone, body.zone_id)
    if zone is None or not zone.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found or inactive")

    # Fetch all candidate tables (fit party, not blocked)
    tables_result = await db.execute(
        select(Table).where(
            and_(
                Table.zone_id == body.zone_id,
                Table.status != TableStatus.BLOCKED,
                Table.min_covers <= body.party_size,
                Table.max_covers >= body.party_size,
            )
        )
    )
    tables = list(tables_result.scalars().all())
    if not tables:
        return SeatingSuggestResponse(suggestions=[], total_candidates=0)

    # Filter out tables with conflicting reservations at this slot
    slot_end = body.reserved_at + timedelta(minutes=body.duration_minutes)
    table_ids = [t.id for t in tables]

    conflict_result = await db.execute(
        select(Reservation.table_id).where(
            and_(
                Reservation.table_id.in_(table_ids),
                Reservation.status.in_(list(BLOCKING_STATUSES)),
                Reservation.reserved_at < slot_end,
                (
                    Reservation.reserved_at
                    + func.make_interval(0, 0, 0, 0, 0, Reservation.duration_minutes)
                )
                > body.reserved_at,
                Reservation.deleted_at.is_(None),
            )
        )
    )
    busy_table_ids: set[uuid.UUID] = {row.table_id for row in conflict_result.all()}
    available_tables = [t for t in tables if t.id not in busy_table_ids]

    if not available_tables:
        return SeatingSuggestResponse(suggestions=[], total_candidates=len(tables))

    # Compute section load (active reservations per zone today)
    zone_load_result = await db.execute(
        select(Reservation.zone_id, func.count().label("cnt")).where(
            and_(
                Reservation.status.in_(list(BLOCKING_STATUSES)),
                Reservation.reserved_at < slot_end,
                (
                    Reservation.reserved_at
                    + func.make_interval(0, 0, 0, 0, 0, Reservation.duration_minutes)
                )
                > body.reserved_at,
                Reservation.deleted_at.is_(None),
            )
        ).group_by(Reservation.zone_id)
    )
    zone_load: dict[uuid.UUID, int] = {row.zone_id: row.cnt for row in zone_load_result.all()}
    max_load = max(zone_load.values(), default=0)

    # Score and rank
    scored: list[TableSuggestion] = []
    for table in available_tables:
        s_size = _score_size_fit(table, body.party_size)
        s_balance = _score_section_balance(table, zone_load, max_load)
        s_vip = _score_vip_placement(table, zone.zone_type, is_vip)
        s_turn = _score_turn_time(table)
        s_rev = _score_revenue(table, body.estimated_spend_ron)

        total = (
            s_size * _W_SIZE_FIT
            + s_balance * _W_SECTION_BALANCE
            + s_vip * _W_VIP_PLACEMENT
            + s_turn * _W_TURN_TIME
            + s_rev * _W_REVENUE
        )

        scored.append(
            TableSuggestion(
                table_id=table.id,
                label=table.label,
                zone_id=table.zone_id,
                shape=table.shape.value,
                min_covers=table.min_covers,
                max_covers=table.max_covers,
                is_accessible=table.is_accessible,
                is_outdoor=table.is_outdoor,
                score=round(total, 4),
                score_breakdown=ScoreBreakdown(
                    size_fit=round(s_size, 4),
                    section_balance=round(s_balance, 4),
                    vip_placement=round(s_vip, 4),
                    turn_time=round(s_turn, 4),
                    revenue=round(s_rev, 4),
                    total=round(total, 4),
                ),
            )
        )

    scored.sort(key=lambda s: s.score, reverse=True)

    logger.info(
        "seating.suggest",
        zone_id=str(body.zone_id),
        party_size=body.party_size,
        is_vip=is_vip,
        candidates=len(tables),
        available=len(available_tables),
        top_score=scored[0].score if scored else None,
    )

    return SeatingSuggestResponse(
        suggestions=scored,
        total_candidates=len(tables),
    )
