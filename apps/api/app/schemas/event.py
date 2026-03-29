import uuid
from datetime import datetime

from app.models.event import EventStatus, TicketStatus
from app.schemas.common import OrmBase, TimestampedBase


class EventCreate(OrmBase):
    venue_id: uuid.UUID
    zone_id: uuid.UUID | None = None
    name: str
    slug: str
    description: str | None = None
    starts_at: datetime
    ends_at: datetime
    doors_open_at: datetime | None = None
    total_capacity: int
    ticket_price_ron: float | None = None
    is_free: bool = False
    external_ticket_url: str | None = None


class EventUpdate(OrmBase):
    name: str | None = None
    description: str | None = None
    status: EventStatus | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    doors_open_at: datetime | None = None
    total_capacity: int | None = None
    ticket_price_ron: float | None = None
    external_ticket_url: str | None = None


class EventRead(TimestampedBase):
    zone_id: uuid.UUID | None
    name: str
    slug: str
    description: str | None
    status: EventStatus
    starts_at: datetime
    ends_at: datetime
    doors_open_at: datetime | None
    total_capacity: int
    tickets_sold: int
    ticket_price_ron: float | None
    is_free: bool
    external_ticket_url: str | None


class TicketCreate(OrmBase):
    venue_id: uuid.UUID
    event_id: uuid.UUID
    guest_id: uuid.UUID | None = None


class TicketRead(TimestampedBase):
    event_id: uuid.UUID
    guest_id: uuid.UUID | None
    ticket_number: str
    qr_code: str
    status: TicketStatus
    amount_paid_ron: float | None
    checked_in_at: datetime | None
