"""Shifts router — /api/v1/shifts.

Endpoints:
  GET    /shifts              — list shifts for a date + venue
  POST   /shifts              — create shift (manager+)
  GET    /shifts/{id}         — get shift with assignments
  PATCH  /shifts/{id}         — update notes / cover_target (manager+)
  POST   /shifts/{id}/briefing — regenerate pre-shift briefing (manager+)
  GET    /shifts/{id}/pacing  — kitchen cover-flow in 15-min buckets
  POST   /shifts/{id}/assignments       — assign server to section (manager+)
  DELETE /shifts/{id}/assignments/{aid} — remove assignment (manager+)
"""

import uuid
from datetime import date, datetime, time as dtime, timezone, timedelta
from math import ceil
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import require_manager, require_staff
from app.models.reservation import Reservation, ReservationStatus
from app.models.shift import Shift
from app.models.staff import ShiftAssignment, StaffMember
from app.schemas.shift import (
    ShiftAssignmentCreate,
    ShiftAssignmentRead,
    ShiftCreate,
    ShiftUpdate,
    ShiftRead,
    ShiftWithAssignmentsRead,
    PacingBucket,
    PacingResponse,
)

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["shifts"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
StaffDep = Annotated[dict, Depends(require_staff)]
ManagerDep = Annotated[dict, Depends(require_manager)]


# ── helpers ───────────────────────────────────────────────────────────────────

async def _get_shift_or_404(shift_id: uuid.UUID, db: AsyncSession) -> Shift:
    result = await db.execute(
        select(Shift)
        .options(selectinload(Shift.assignments).selectinload(ShiftAssignment.staff_member))
        .where(and_(Shift.id == shift_id, Shift.deleted_at.is_(None)))
    )
    shift = result.scalar_one_or_none()
    if shift is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found.")
    return shift


def _briefing_from_reservations(reservations: list[Reservation], zone_name: str) -> str:
    """Build a plain-text pre-shift briefing from a list of reservations."""
    total = len(reservations)
    covers = sum(r.party_size for r in reservations)
    vip_guests = [r for r in reservations if getattr(r, "guest", None) and getattr(r.guest, "is_vip", False)]
    vip_count = len(vip_guests)

    occasions: dict[str, int] = {}
    dietary: dict[str, int] = {}
    for r in reservations:
        if r.special_occasion:
            occasions[r.special_occasion.value] = occasions.get(r.special_occasion.value, 0) + 1
        for tag in (r.dietary_tags or []):
            dietary[tag] = dietary.get(tag, 0) + 1

    lines = [
        f"## Pre-shift briefing — {zone_name}",
        f"",
        f"**Rezervări:** {total}  |  **Coperți:** {covers}",
    ]

    if vip_count:
        lines.append(f"**VIP:** {vip_count} oaspeți VIP așteptați — atenție sporită")

    if occasions:
        occ_parts = [f"{v}× {k}" for k, v in sorted(occasions.items())]
        lines.append(f"**Ocazii speciale:** {', '.join(occ_parts)}")

    if dietary:
        diet_parts = [f"{v}× {k}" for k, v in sorted(dietary.items())]
        lines.append(f"**Restricții alimentare:** {', '.join(diet_parts)}")

    if not vip_count and not occasions and not dietary:
        lines.append("Nicio alertă specială pentru acest tur.")

    return "\n".join(lines)


# ── list ──────────────────────────────────────────────────────────────────────

@router.get(
    "/shifts",
    response_model=list[ShiftRead],
    summary="List shifts for a date and venue",
)
async def list_shifts(
    db: DbDep,
    _auth: StaffDep,
    venue_id: Annotated[uuid.UUID, Query()],
    shift_date: Annotated[date | None, Query(description="Filter by date (YYYY-MM-DD)")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[Shift]:
    filters = [Shift.venue_id == venue_id, Shift.deleted_at.is_(None)]
    if shift_date:
        filters.append(Shift.shift_date == shift_date)
    result = await db.execute(
        select(Shift).where(and_(*filters)).order_by(Shift.shift_date, Shift.starts_at).limit(limit)
    )
    return list(result.scalars().all())


# ── create ────────────────────────────────────────────────────────────────────

@router.post(
    "/shifts",
    status_code=status.HTTP_201_CREATED,
    response_model=ShiftWithAssignmentsRead,
    summary="Create a shift",
)
async def create_shift(body: ShiftCreate, db: DbDep, _auth: ManagerDep) -> Shift:
    shift = Shift(
        venue_id=body.venue_id,
        zone_id=body.zone_id,
        shift_date=body.shift_date,
        shift_type=body.shift_type,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        cover_target=body.cover_target,
    )
    db.add(shift)
    await db.flush()
    await db.refresh(shift)
    logger.info("shift.created", shift_id=str(shift.id), shift_type=shift.shift_type)
    return await _get_shift_or_404(shift.id, db)


# ── get ───────────────────────────────────────────────────────────────────────

@router.get(
    "/shifts/{shift_id}",
    response_model=ShiftWithAssignmentsRead,
    summary="Get a shift with assignments",
)
async def get_shift(shift_id: uuid.UUID, db: DbDep, _auth: StaffDep) -> Shift:
    return await _get_shift_or_404(shift_id, db)


# ── update ────────────────────────────────────────────────────────────────────

@router.patch(
    "/shifts/{shift_id}",
    response_model=ShiftWithAssignmentsRead,
    summary="Update shift notes or cover target",
)
async def update_shift(shift_id: uuid.UUID, body: ShiftUpdate, db: DbDep, _auth: ManagerDep) -> Shift:
    shift = await _get_shift_or_404(shift_id, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(shift, field, value)
    await db.flush()
    logger.info("shift.updated", shift_id=str(shift_id))
    return await _get_shift_or_404(shift_id, db)


# ── briefing ──────────────────────────────────────────────────────────────────

@router.post(
    "/shifts/{shift_id}/briefing",
    response_model=ShiftWithAssignmentsRead,
    summary="Regenerate pre-shift briefing from reservation data",
)
async def regenerate_briefing(shift_id: uuid.UUID, db: DbDep, _auth: ManagerDep) -> Shift:
    shift = await _get_shift_or_404(shift_id, db)

    # Load zone name for the briefing header
    from app.models.zone import Zone
    zone_result = await db.execute(select(Zone).where(Zone.id == shift.zone_id))
    zone = zone_result.scalar_one_or_none()
    zone_name = zone.name if zone else str(shift.zone_id)

    # Fetch upcoming reservations inside the shift window
    res_result = await db.execute(
        select(Reservation).where(
            and_(
                Reservation.zone_id == shift.zone_id,
                Reservation.venue_id == shift.venue_id,
                Reservation.reserved_at >= shift.starts_at,
                Reservation.reserved_at < shift.ends_at,
                Reservation.status.in_([
                    ReservationStatus.CONFIRMED,
                    ReservationStatus.PENDING,
                    ReservationStatus.CHECKED_IN,
                ]),
                Reservation.deleted_at.is_(None),
            )
        )
    )
    reservations = list(res_result.scalars().all())

    shift.briefing_notes = _briefing_from_reservations(reservations, zone_name)
    await db.flush()
    logger.info("shift.briefing_regenerated", shift_id=str(shift_id), reservation_count=len(reservations))
    return await _get_shift_or_404(shift_id, db)


# ── pacing ────────────────────────────────────────────────────────────────────

@router.get(
    "/shifts/{shift_id}/pacing",
    response_model=PacingResponse,
    summary="Kitchen cover-flow pacing in 15-min buckets",
)
async def get_pacing(shift_id: uuid.UUID, db: DbDep, _auth: StaffDep) -> PacingResponse:
    shift = await _get_shift_or_404(shift_id, db)

    # Build 15-min bucket boundaries for the shift window
    window_start = shift.starts_at
    window_end = shift.ends_at
    bucket_minutes = 15
    n_buckets = ceil((window_end - window_start).total_seconds() / 60 / bucket_minutes)
    buckets: list[PacingBucket] = []
    for i in range(n_buckets):
        bucket_start = window_start + timedelta(minutes=i * bucket_minutes)
        bucket_end = bucket_start + timedelta(minutes=bucket_minutes)
        buckets.append(PacingBucket(
            bucket_start=bucket_start,
            bucket_end=bucket_end,
            covers=0,
            reservations=0,
        ))

    # Load reservations for this zone within the shift window
    res_result = await db.execute(
        select(Reservation).where(
            and_(
                Reservation.zone_id == shift.zone_id,
                Reservation.venue_id == shift.venue_id,
                Reservation.reserved_at >= window_start,
                Reservation.reserved_at < window_end,
                Reservation.status.in_([
                    ReservationStatus.CONFIRMED,
                    ReservationStatus.PENDING,
                    ReservationStatus.CHECKED_IN,
                ]),
                Reservation.deleted_at.is_(None),
            )
        )
    )
    reservations = list(res_result.scalars().all())

    # Distribute into buckets
    for r in reservations:
        offset_min = (r.reserved_at - window_start).total_seconds() / 60
        idx = int(offset_min // bucket_minutes)
        if 0 <= idx < len(buckets):
            buckets[idx].covers += r.party_size
            buckets[idx].reservations += 1

    return PacingResponse(
        shift_id=shift.id,
        window_start=window_start,
        window_end=window_end,
        buckets=buckets,
        total_covers=sum(b.covers for b in buckets),
    )


# ── assignments ───────────────────────────────────────────────────────────────

@router.post(
    "/shifts/{shift_id}/assignments",
    status_code=status.HTTP_201_CREATED,
    response_model=ShiftAssignmentRead,
    summary="Assign a server to a section in a shift",
)
async def create_assignment(
    shift_id: uuid.UUID,
    body: ShiftAssignmentCreate,
    db: DbDep,
    _auth: ManagerDep,
) -> ShiftAssignment:
    shift = await _get_shift_or_404(shift_id, db)

    # Validate staff member exists
    staff_result = await db.execute(
        select(StaffMember).where(
            and_(StaffMember.id == body.staff_member_id, StaffMember.is_active == True)
        )
    )
    staff = staff_result.scalar_one_or_none()
    if staff is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found or inactive.")

    assignment = ShiftAssignment(
        venue_id=shift.venue_id,
        shift_id=shift_id,
        staff_member_id=body.staff_member_id,
        zone_id=body.zone_id or shift.zone_id,
        section_label=body.section_label,
    )
    db.add(assignment)
    await db.flush()
    await db.refresh(assignment)

    # Reload with staff relationship
    result = await db.execute(
        select(ShiftAssignment)
        .options(selectinload(ShiftAssignment.staff_member))
        .where(ShiftAssignment.id == assignment.id)
    )
    loaded = result.scalar_one()
    logger.info("shift.assignment.created", shift_id=str(shift_id), staff_id=str(body.staff_member_id))
    return loaded


@router.delete(
    "/shifts/{shift_id}/assignments/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a server assignment from a shift",
)
async def delete_assignment(
    shift_id: uuid.UUID,
    assignment_id: uuid.UUID,
    db: DbDep,
    _auth: ManagerDep,
) -> None:
    result = await db.execute(
        select(ShiftAssignment).where(
            and_(ShiftAssignment.id == assignment_id, ShiftAssignment.shift_id == shift_id)
        )
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    await db.delete(assignment)
    await db.flush()
    logger.info("shift.assignment.deleted", shift_id=str(shift_id), assignment_id=str(assignment_id))
