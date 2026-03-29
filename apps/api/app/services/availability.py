"""Availability service — computes bookable slots for a zone on a given date."""

from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reservation import Reservation, ReservationStatus
from app.models.table import Table, TableStatus
from app.models.zone import Zone


# Slot granularity in minutes
SLOT_GRANULARITY = 15

# Statuses that block a table during the reservation window
BLOCKING_STATUSES = {
    ReservationStatus.PENDING,
    ReservationStatus.CONFIRMED,
    ReservationStatus.CHECKED_IN,
    ReservationStatus.WAITLISTED,
}


async def get_available_slots(
    db: AsyncSession,
    *,
    zone_id: UUID,
    slot_date: date,
    party_size: int,
    duration_minutes: int = 90,
) -> list[datetime]:
    """Return datetime slots (UTC) with at least one table available for party_size.

    Algorithm:
    1. Load zone operating hours.
    2. Load tables that fit the party size.
    3. For each slot in [opens_at, closes_at - duration], check if any table
       has no overlapping confirmed/pending reservation.
    """
    zone = await db.get(Zone, zone_id)
    if zone is None or not zone.is_active:
        return []

    opens: time = zone.opens_at or time(12, 0)
    closes: time = zone.closes_at or time(23, 0)

    # Build candidate slot list
    slot_start = datetime.combine(slot_date, opens, tzinfo=timezone.utc)
    slot_end = datetime.combine(slot_date, closes, tzinfo=timezone.utc) - timedelta(minutes=duration_minutes)

    if slot_start >= slot_end:
        return []

    slots: list[datetime] = []
    current = slot_start
    while current <= slot_end:
        slots.append(current)
        current += timedelta(minutes=SLOT_GRANULARITY)

    # Tables that can seat the party
    tables_result = await db.execute(
        select(Table).where(
            and_(
                Table.zone_id == zone_id,
                Table.status != TableStatus.BLOCKED,
                Table.min_covers <= party_size,
                Table.max_covers >= party_size,
            )
        )
    )
    tables = tables_result.scalars().all()
    if not tables:
        return []

    table_ids = [t.id for t in tables]

    # Fetch conflicting reservations for this zone on this date in one query
    day_start = datetime.combine(slot_date, time.min, tzinfo=timezone.utc)
    day_end = datetime.combine(slot_date, time.max, tzinfo=timezone.utc)

    busy_result = await db.execute(
        select(Reservation.table_id, Reservation.reserved_at, Reservation.duration_minutes).where(
            and_(
                Reservation.table_id.in_(table_ids),
                Reservation.status.in_(list(BLOCKING_STATUSES)),
                Reservation.reserved_at >= day_start,
                Reservation.reserved_at <= day_end,
                Reservation.deleted_at.is_(None),
            )
        )
    )
    busy_rows = busy_result.all()

    # Build a set of (table_id, slot) pairs that are blocked
    blocked: set[tuple[UUID, datetime]] = set()
    for row in busy_rows:
        res_start = row.reserved_at
        res_end = res_start + timedelta(minutes=row.duration_minutes)
        # Mark every slot that overlaps this reservation as blocked for this table
        c = slot_start
        while c <= slot_end:
            slot_end_time = c + timedelta(minutes=duration_minutes)
            if c < res_end and slot_end_time > res_start:
                blocked.add((row.table_id, c))
            c += timedelta(minutes=SLOT_GRANULARITY)

    # A slot is available if at least one table is NOT blocked for it
    available: list[datetime] = []
    for slot in slots:
        for tid in table_ids:
            if (tid, slot) not in blocked:
                available.append(slot)
                break

    return available


async def find_table_for_slot(
    db: AsyncSession,
    *,
    zone_id: UUID,
    reserved_at: datetime,
    party_size: int,
    duration_minutes: int = 90,
) -> Table | None:
    """Return the first eligible table for a given slot, or None if fully booked."""
    tables_result = await db.execute(
        select(Table).where(
            and_(
                Table.zone_id == zone_id,
                Table.status != TableStatus.BLOCKED,
                Table.min_covers <= party_size,
                Table.max_covers >= party_size,
            )
        )
    )
    tables = tables_result.scalars().all()
    if not tables:
        return None

    slot_end = reserved_at + timedelta(minutes=duration_minutes)

    for table in tables:
        conflict_result = await db.execute(
            select(func.count()).where(  # type: ignore[call-overload]
                and_(
                    Reservation.table_id == table.id,
                    Reservation.status.in_(list(BLOCKING_STATUSES)),
                    Reservation.reserved_at < slot_end,
                    (Reservation.reserved_at + func.make_interval(0, 0, 0, 0, 0, Reservation.duration_minutes)) > reserved_at,
                    Reservation.deleted_at.is_(None),
                )
            )
        )
        if conflict_result.scalar_one() == 0:
            return table

    return None
