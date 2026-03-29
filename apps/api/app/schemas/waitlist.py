import uuid
from datetime import datetime

from app.models.waitlist import WaitlistStatus
from app.schemas.common import OrmBase, TimestampedBase


class WaitlistEntryCreate(OrmBase):
    venue_id: uuid.UUID
    zone_id: uuid.UUID
    guest_id: uuid.UUID | None = None
    guest_name: str | None = None
    phone: str | None = None   # Encrypted before persistence
    party_size: int
    notes: str | None = None
    dietary_tags: list[str] | None = None


class WaitlistEntryUpdate(OrmBase):
    status: WaitlistStatus | None = None
    queue_position: int | None = None
    estimated_wait_minutes: int | None = None
    table_id: uuid.UUID | None = None
    notified_at: datetime | None = None
    seated_at: datetime | None = None


class WaitlistEntryRead(TimestampedBase):
    zone_id: uuid.UUID
    guest_id: uuid.UUID | None
    guest_name: str | None
    party_size: int
    notes: str | None
    dietary_tags: list[str] | None
    queue_position: int
    joined_at: datetime
    estimated_wait_minutes: int | None
    notified_at: datetime | None
    seated_at: datetime | None
    table_id: uuid.UUID | None
    status: WaitlistStatus
    qr_token: str | None
