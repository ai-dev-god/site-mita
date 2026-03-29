"""Reservations router — /api/v1/reservations + /api/v1/availability."""

import secrets
import string
import uuid
from datetime import date, datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.schemas.reservation import ReservationCreate, ReservationRead, ReservationUpdate
from app.services.availability import find_table_for_slot, get_available_slots

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["reservations"])

DbDep = Annotated[AsyncSession, Depends(get_db)]

# ── Helpers ───────────────────────────────────────────────────────────────────

_CONFIRMATION_ALPHABET = string.ascii_uppercase + string.digits


def _generate_confirmation_code() -> str:
    return "".join(secrets.choice(_CONFIRMATION_ALPHABET) for _ in range(8))


def _generate_cancellation_token() -> str:
    return secrets.token_urlsafe(32)


# ── Availability ──────────────────────────────────────────────────────────────

class AvailabilitySlot:
    def __init__(self, slot: datetime) -> None:
        self.slot = slot

    def model_dump(self) -> dict:
        return {"slot": self.slot.isoformat()}


@router.get(
    "/availability",
    summary="Get available booking slots",
    response_model=list[str],
)
async def list_available_slots(
    db: DbDep,
    zone_id: Annotated[uuid.UUID, Query(description="Zone to check availability for")],
    slot_date: Annotated[date, Query(description="Date in YYYY-MM-DD")],
    party_size: Annotated[int, Query(ge=1, le=20, description="Number of guests")],
    duration_minutes: Annotated[int, Query(ge=30, le=360, description="Estimated duration")] = 90,
) -> list[str]:
    """Return ISO-8601 UTC datetime strings for bookable slots."""
    slots = await get_available_slots(
        db,
        zone_id=zone_id,
        slot_date=slot_date,
        party_size=party_size,
        duration_minutes=duration_minutes,
    )
    return [s.isoformat() for s in slots]


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post(
    "/reservations",
    status_code=status.HTTP_201_CREATED,
    response_model=ReservationRead,
    summary="Create a reservation",
)
async def create_reservation(body: ReservationCreate, db: DbDep) -> Reservation:
    """Create a new reservation with idempotency support.

    - If an `idempotency_key` is provided and a matching reservation exists,
      returns the existing record (HTTP 200 is replaced by 201 on first call).
    - Assigns the first available table for the slot.
    - Generates a confirmation code and cancellation token.
    """
    # Idempotency check
    if body.idempotency_key:
        existing_result = await db.execute(
            select(Reservation).where(Reservation.idempotency_key == body.idempotency_key)
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            return existing

    # Table assignment
    table = await find_table_for_slot(
        db,
        zone_id=body.zone_id,
        reserved_at=body.reserved_at,
        party_size=body.party_size,
        duration_minutes=body.duration_minutes,
    )
    if table is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "no_availability",
                "message": "No tables available for the requested slot and party size.",
            },
        )

    reservation = Reservation(
        venue_id=body.venue_id,
        zone_id=body.zone_id,
        table_id=table.id,
        guest_id=body.guest_id,
        reserved_at=body.reserved_at,
        duration_minutes=body.duration_minutes,
        party_size=body.party_size,
        status=ReservationStatus.CONFIRMED,
        special_occasion=body.special_occasion,
        dietary_tags=body.dietary_tags,
        guest_notes=body.guest_notes,
        source=body.source,
        language=body.language,
        idempotency_key=body.idempotency_key,
        confirmation_code=_generate_confirmation_code(),
        cancellation_token=_generate_cancellation_token(),
    )
    db.add(reservation)
    await db.flush()
    await db.refresh(reservation)

    logger.info(
        "reservation.created",
        reservation_id=str(reservation.id),
        confirmation_code=reservation.confirmation_code,
        zone_id=str(body.zone_id),
        party_size=body.party_size,
    )

    # Notifications are fire-and-forget; wire up after guest CRM (LAM-20)
    # await send_confirmation_email(reservation, guest_email)
    # await send_confirmation_sms(reservation, guest_phone)

    return reservation


@router.get(
    "/reservations/{reservation_id}",
    response_model=ReservationRead,
    summary="Get a reservation by ID",
)
async def get_reservation(reservation_id: uuid.UUID, db: DbDep) -> Reservation:
    result = await db.execute(
        select(Reservation).where(
            and_(
                Reservation.id == reservation_id,
                Reservation.deleted_at.is_(None),
            )
        )
    )
    reservation = result.scalar_one_or_none()
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found.")
    return reservation


@router.patch(
    "/reservations/{reservation_id}",
    response_model=ReservationRead,
    summary="Modify a reservation",
)
async def update_reservation(
    reservation_id: uuid.UUID,
    body: ReservationUpdate,
    db: DbDep,
) -> Reservation:
    """Modify time, party size, notes, or status.

    Re-checks table availability if reserved_at or party_size changes.
    """
    result = await db.execute(
        select(Reservation).where(
            and_(
                Reservation.id == reservation_id,
                Reservation.deleted_at.is_(None),
            )
        )
    )
    reservation = result.scalar_one_or_none()
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found.")

    if reservation.status in {ReservationStatus.CANCELLED_BY_GUEST, ReservationStatus.CANCELLED_BY_VENUE}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot modify a cancelled reservation.",
        )

    # If time or party size changes, re-validate availability
    new_time = body.reserved_at or reservation.reserved_at
    new_size = body.party_size or reservation.party_size
    new_duration = body.duration_minutes or reservation.duration_minutes

    time_changed = body.reserved_at is not None and body.reserved_at != reservation.reserved_at
    size_changed = body.party_size is not None and body.party_size != reservation.party_size

    if time_changed or size_changed:
        table = await find_table_for_slot(
            db,
            zone_id=reservation.zone_id,
            reserved_at=new_time,
            party_size=new_size,
            duration_minutes=new_duration,
        )
        if table is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "no_availability",
                    "message": "No tables available for the requested slot and party size.",
                },
            )
        reservation.table_id = table.id

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(reservation, field, value)

    await db.flush()
    await db.refresh(reservation)

    logger.info("reservation.updated", reservation_id=str(reservation_id))
    return reservation


@router.delete(
    "/reservations/{reservation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel a reservation",
)
async def cancel_reservation(reservation_id: uuid.UUID, db: DbDep) -> None:
    """Cancel via reservation ID (staff/admin path).

    Self-service guest cancellation uses the tokenized route below.
    """
    result = await db.execute(
        select(Reservation).where(
            and_(
                Reservation.id == reservation_id,
                Reservation.deleted_at.is_(None),
            )
        )
    )
    reservation = result.scalar_one_or_none()
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found.")

    if reservation.status in {ReservationStatus.CANCELLED_BY_GUEST, ReservationStatus.CANCELLED_BY_VENUE}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reservation is already cancelled.",
        )

    reservation.status = ReservationStatus.CANCELLED_BY_VENUE
    await db.flush()
    logger.info("reservation.cancelled_by_venue", reservation_id=str(reservation_id))


@router.delete(
    "/reservations/cancel/{cancellation_token}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Guest self-service cancellation via tokenized link",
)
async def cancel_reservation_by_token(cancellation_token: str, db: DbDep) -> None:
    """Tokenized self-service cancellation link (emailed to guest)."""
    result = await db.execute(
        select(Reservation).where(
            and_(
                Reservation.cancellation_token == cancellation_token,
                Reservation.deleted_at.is_(None),
            )
        )
    )
    reservation = result.scalar_one_or_none()
    if reservation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired cancellation token.",
        )

    if reservation.status in {ReservationStatus.CANCELLED_BY_GUEST, ReservationStatus.CANCELLED_BY_VENUE}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Reservation is already cancelled.",
        )

    reservation.status = ReservationStatus.CANCELLED_BY_GUEST
    # Invalidate token after use
    reservation.cancellation_token = None
    await db.flush()

    logger.info("reservation.cancelled_by_guest", reservation_id=str(reservation.id))


@router.patch(
    "/reservations/modify/{cancellation_token}",
    response_model=ReservationRead,
    summary="Guest self-service modify via tokenized link",
)
async def modify_reservation_by_token(
    cancellation_token: str,
    body: ReservationUpdate,
    db: DbDep,
) -> Reservation:
    """Tokenized self-service modification (linked from confirmation SMS/email)."""
    result = await db.execute(
        select(Reservation).where(
            and_(
                Reservation.cancellation_token == cancellation_token,
                Reservation.deleted_at.is_(None),
            )
        )
    )
    reservation = result.scalar_one_or_none()
    if reservation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired modification token.",
        )

    if reservation.status in {ReservationStatus.CANCELLED_BY_GUEST, ReservationStatus.CANCELLED_BY_VENUE}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot modify a cancelled reservation.",
        )

    new_time = body.reserved_at or reservation.reserved_at
    new_size = body.party_size or reservation.party_size
    new_duration = body.duration_minutes or reservation.duration_minutes

    time_changed = body.reserved_at is not None and body.reserved_at != reservation.reserved_at
    size_changed = body.party_size is not None and body.party_size != reservation.party_size

    if time_changed or size_changed:
        table = await find_table_for_slot(
            db,
            zone_id=reservation.zone_id,
            reserved_at=new_time,
            party_size=new_size,
            duration_minutes=new_duration,
        )
        if table is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "no_availability",
                    "message": "No tables available for the requested slot and party size.",
                },
            )
        reservation.table_id = table.id

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(reservation, field, value)

    await db.flush()
    await db.refresh(reservation)
    logger.info("reservation.modified_by_guest", reservation_id=str(reservation.id))
    return reservation


@router.get(
    "/reservations",
    response_model=list[ReservationRead],
    summary="List reservations with filters",
)
async def list_reservations(
    db: DbDep,
    zone_id: Annotated[uuid.UUID | None, Query()] = None,
    slot_date: Annotated[date | None, Query(description="Filter by date (YYYY-MM-DD)")] = None,
    reservation_status: Annotated[ReservationStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[Reservation]:
    """List reservations. Supports filtering by zone, date, and status."""
    filters = [Reservation.deleted_at.is_(None)]

    if zone_id:
        filters.append(Reservation.zone_id == zone_id)
    if reservation_status:
        filters.append(Reservation.status == reservation_status)
    if slot_date:
        from datetime import time as dtime, timezone

        day_start = datetime.combine(slot_date, dtime.min, tzinfo=timezone.utc)
        day_end = datetime.combine(slot_date, dtime.max, tzinfo=timezone.utc)
        filters.append(Reservation.reserved_at >= day_start)
        filters.append(Reservation.reserved_at <= day_end)

    result = await db.execute(
        select(Reservation)
        .where(and_(*filters))
        .order_by(Reservation.reserved_at)
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())
