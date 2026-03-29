"""Events router — /api/v1/events + /api/v1/tickets/checkin."""

import base64
import hashlib
import hmac
import json
import secrets
import string
import uuid
from datetime import datetime, timezone
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import require_admin, require_manager, require_staff
from app.models.event import Event, EventStatus, Ticket, TicketStatus
from app.schemas.event import EventCreate, EventRead, EventUpdate, TicketCreate, TicketRead

logger = structlog.get_logger(__name__)
settings = get_settings()

router = APIRouter(tags=["events"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
StaffDep = Annotated[dict, Depends(require_staff)]
ManagerDep = Annotated[dict, Depends(require_manager)]
AdminDep = Annotated[dict, Depends(require_admin)]

_TICKET_ALPHABET = string.ascii_uppercase + string.digits


# ── QR helpers ────────────────────────────────────────────────────────────────


def _generate_ticket_number() -> str:
    return "TK-" + "".join(secrets.choice(_TICKET_ALPHABET) for _ in range(10))


def _sign_ticket_payload(ticket_id: str, event_id: str, ticket_number: str) -> str:
    """Return a compact HMAC-signed token used as QR payload.

    Format: base64(json_payload).base64(hmac_sha256)
    """
    payload = json.dumps(
        {"tid": ticket_id, "eid": event_id, "tn": ticket_number}, separators=(",", ":")
    )
    payload_b64 = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    sig = hmac.new(
        settings.secret_key.get_secret_value().encode(),
        payload_b64.encode(),
        hashlib.sha256,
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode().rstrip("=")
    return f"{payload_b64}.{sig_b64}"


def _verify_qr_token(token: str) -> dict | None:
    """Verify HMAC signature and return payload dict, or None on failure."""
    try:
        payload_b64, sig_b64 = token.rsplit(".", 1)
    except ValueError:
        return None

    expected_sig = hmac.new(
        settings.secret_key.get_secret_value().encode(),
        payload_b64.encode(),
        hashlib.sha256,
    ).digest()
    expected_b64 = base64.urlsafe_b64encode(expected_sig).decode().rstrip("=")

    if not hmac.compare_digest(sig_b64, expected_b64):
        return None

    padding = 4 - len(payload_b64) % 4
    try:
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + "=" * padding)
        return json.loads(payload_bytes)
    except Exception:
        return None


# ── Event CRUD ────────────────────────────────────────────────────────────────


@router.get(
    "/events",
    response_model=list[EventRead],
    summary="List events",
)
async def list_events(
    db: DbDep,
    venue_id: Annotated[uuid.UUID, Query(description="Venue to list events for")],
    event_status: Annotated[EventStatus | None, Query(alias="status")] = None,
    upcoming_only: Annotated[bool, Query()] = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[Event]:
    """Public: list events. Defaults to published events only if no status filter given."""
    filters = [
        Event.venue_id == venue_id,
        Event.deleted_at.is_(None),
    ]
    if event_status:
        filters.append(Event.status == event_status)
    else:
        filters.append(Event.status == EventStatus.PUBLISHED)

    if upcoming_only:
        filters.append(Event.starts_at >= datetime.now(tz=timezone.utc))

    result = await db.execute(
        select(Event)
        .where(and_(*filters))
        .order_by(Event.starts_at)
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


@router.get(
    "/events/{event_id}",
    response_model=EventRead,
    summary="Get event by ID",
)
async def get_event(event_id: uuid.UUID, db: DbDep) -> Event:
    result = await db.execute(
        select(Event).where(
            and_(Event.id == event_id, Event.deleted_at.is_(None))
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    return event


@router.get(
    "/events/by-slug/{slug}",
    response_model=EventRead,
    summary="Get event by slug (public)",
)
async def get_event_by_slug(
    slug: str,
    db: DbDep,
    venue_id: Annotated[uuid.UUID, Query()],
) -> Event:
    result = await db.execute(
        select(Event).where(
            and_(
                Event.slug == slug,
                Event.venue_id == venue_id,
                Event.deleted_at.is_(None),
            )
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    return event


@router.post(
    "/events",
    status_code=status.HTTP_201_CREATED,
    response_model=EventRead,
    summary="Create event (admin/manager)",
)
async def create_event(body: EventCreate, db: DbDep, _auth: ManagerDep) -> Event:
    # Slug uniqueness check within venue
    existing = await db.execute(
        select(Event).where(
            and_(Event.slug == body.slug, Event.venue_id == body.venue_id, Event.deleted_at.is_(None))
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An event with this slug already exists for this venue.",
        )

    event = Event(
        venue_id=body.venue_id,
        zone_id=body.zone_id,
        name=body.name,
        slug=body.slug,
        description=body.description,
        status=EventStatus.DRAFT,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        doors_open_at=body.doors_open_at,
        total_capacity=body.total_capacity,
        tickets_sold=0,
        ticket_price_ron=body.ticket_price_ron,
        is_free=body.is_free,
        external_ticket_url=body.external_ticket_url,
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    logger.info("event.created", event_id=str(event.id), name=event.name)
    return event


@router.patch(
    "/events/{event_id}",
    response_model=EventRead,
    summary="Update event (admin/manager)",
)
async def update_event(
    event_id: uuid.UUID, body: EventUpdate, db: DbDep, _auth: ManagerDep
) -> Event:
    result = await db.execute(
        select(Event).where(and_(Event.id == event_id, Event.deleted_at.is_(None)))
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    if event.status == EventStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot update a cancelled event.",
        )

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(event, field, value)

    await db.flush()
    await db.refresh(event)
    logger.info("event.updated", event_id=str(event_id))
    return event


@router.delete(
    "/events/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel/delete event (admin)",
)
async def delete_event(event_id: uuid.UUID, db: DbDep, _auth: AdminDep) -> None:
    result = await db.execute(
        select(Event).where(and_(Event.id == event_id, Event.deleted_at.is_(None)))
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    event.status = EventStatus.CANCELLED
    event.deleted_at = datetime.now(tz=timezone.utc)
    await db.flush()
    logger.info("event.deleted", event_id=str(event_id))


# ── Tickets ───────────────────────────────────────────────────────────────────


@router.post(
    "/events/{event_id}/tickets",
    status_code=status.HTTP_201_CREATED,
    response_model=TicketRead,
    summary="Book a ticket for an event",
)
async def book_ticket(event_id: uuid.UUID, body: TicketCreate, db: DbDep) -> Ticket:
    """Public: book a ticket. Validates capacity and event status."""
    result = await db.execute(
        select(Event).where(and_(Event.id == event_id, Event.deleted_at.is_(None)))
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    if event.status not in {EventStatus.PUBLISHED}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Event is not available for booking (status: {event.status.value}).",
        )

    if event.tickets_sold >= event.total_capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "sold_out", "message": "Event is sold out."},
        )

    ticket_number = _generate_ticket_number()
    ticket_id = str(uuid.uuid4())

    qr_code = _sign_ticket_payload(ticket_id, str(event_id), ticket_number)

    ticket = Ticket(
        id=uuid.UUID(ticket_id),
        venue_id=body.venue_id,
        event_id=event_id,
        guest_id=body.guest_id,
        ticket_number=ticket_number,
        qr_code=qr_code,
        status=TicketStatus.RESERVED,
        amount_paid_ron=event.ticket_price_ron if not event.is_free else None,
    )
    db.add(ticket)

    # Increment counter
    event.tickets_sold = event.tickets_sold + 1
    if event.tickets_sold >= event.total_capacity:
        event.status = EventStatus.SOLD_OUT

    await db.flush()
    await db.refresh(ticket)
    logger.info(
        "ticket.booked",
        ticket_id=ticket_id,
        event_id=str(event_id),
        ticket_number=ticket_number,
    )
    return ticket


@router.get(
    "/events/{event_id}/tickets",
    response_model=list[TicketRead],
    summary="List tickets for an event (staff)",
)
async def list_tickets(
    event_id: uuid.UUID,
    db: DbDep,
    _auth: StaffDep,
    ticket_status: Annotated[TicketStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[Ticket]:
    filters = [Ticket.event_id == event_id, Ticket.deleted_at.is_(None)]
    if ticket_status:
        filters.append(Ticket.status == ticket_status)

    result = await db.execute(
        select(Ticket)
        .where(and_(*filters))
        .order_by(Ticket.created_at)
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


@router.get(
    "/tickets/{ticket_id}",
    response_model=TicketRead,
    summary="Get ticket by ID",
)
async def get_ticket(ticket_id: uuid.UUID, db: DbDep) -> Ticket:
    result = await db.execute(
        select(Ticket).where(
            and_(Ticket.id == ticket_id, Ticket.deleted_at.is_(None))
        )
    )
    ticket = result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")
    return ticket


@router.post(
    "/tickets/checkin",
    response_model=TicketRead,
    summary="Check-in via QR code (staff/host)",
)
async def checkin_ticket(
    db: DbDep,
    _auth: StaffDep,
    qr_token: Annotated[str, Query(description="QR code payload scanned from ticket")],
) -> Ticket:
    """Staff check-in: verify QR signature, mark ticket as checked_in."""
    payload = _verify_qr_token(qr_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or tampered QR code.",
        )

    try:
        ticket_id = uuid.UUID(payload["tid"])
    except (KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed QR payload.",
        )

    result = await db.execute(
        select(Ticket).where(
            and_(Ticket.id == ticket_id, Ticket.deleted_at.is_(None))
        )
    )
    ticket = result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    if ticket.status == TicketStatus.CHECKED_IN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "already_checked_in",
                "message": f"Ticket already checked in at {ticket.checked_in_at}.",
            },
        )

    if ticket.status in {TicketStatus.CANCELLED, TicketStatus.REFUNDED}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Ticket is {ticket.status.value} and cannot be used for check-in.",
        )

    ticket.status = TicketStatus.CHECKED_IN
    ticket.checked_in_at = datetime.now(tz=timezone.utc)
    await db.flush()
    await db.refresh(ticket)

    logger.info(
        "ticket.checked_in",
        ticket_id=str(ticket_id),
        event_id=str(ticket.event_id),
        ticket_number=ticket.ticket_number,
    )
    return ticket
