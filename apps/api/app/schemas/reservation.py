import uuid
from datetime import datetime

from pydantic import field_validator

from app.models.reservation import ReservationStatus, SpecialOccasion
from app.schemas.common import OrmBase, TimestampedBase


class ReservationCreate(OrmBase):
    venue_id: uuid.UUID
    zone_id: uuid.UUID
    guest_id: uuid.UUID
    reserved_at: datetime
    party_size: int
    duration_minutes: int = 90
    special_occasion: SpecialOccasion | None = None
    dietary_tags: list[str] | None = None
    guest_notes: str | None = None
    source: str = "direct"
    language: str = "ro"
    idempotency_key: str | None = None

    @field_validator("party_size")
    @classmethod
    def party_size_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("party_size must be at least 1")
        return v


class ReservationUpdate(OrmBase):
    reserved_at: datetime | None = None
    party_size: int | None = None
    table_id: uuid.UUID | None = None
    duration_minutes: int | None = None
    status: ReservationStatus | None = None
    special_occasion: SpecialOccasion | None = None
    dietary_tags: list[str] | None = None
    guest_notes: str | None = None
    internal_notes: str | None = None
    estimated_spend_ron: float | None = None


class ReservationRead(TimestampedBase):
    zone_id: uuid.UUID
    table_id: uuid.UUID | None
    guest_id: uuid.UUID
    reserved_at: datetime
    duration_minutes: int
    actual_seated_at: datetime | None
    actual_departed_at: datetime | None
    party_size: int
    status: ReservationStatus
    special_occasion: SpecialOccasion | None
    dietary_tags: list[str] | None
    guest_notes: str | None
    internal_notes: str | None
    confirmation_code: str | None
    cancellation_token: str | None
    reminder_sent_at: datetime | None
    stripe_hold_amount_cents: int | None
    stripe_hold_currency: str
    stripe_hold_captured: bool
    source: str
    language: str
    estimated_spend_ron: float | None
