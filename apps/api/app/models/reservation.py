import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class ReservationStatus(str, enum.Enum):
    PENDING = "pending"                  # Created, awaiting confirmation
    CONFIRMED = "confirmed"              # Payment hold captured or no-hold policy
    CHECKED_IN = "checked_in"           # Guest arrived, seated
    COMPLETED = "completed"             # Service finished
    CANCELLED_BY_GUEST = "cancelled_by_guest"
    CANCELLED_BY_VENUE = "cancelled_by_venue"
    NO_SHOW = "no_show"
    WAITLISTED = "waitlisted"           # On waitlist, not yet assigned a table


class SpecialOccasion(str, enum.Enum):
    BIRTHDAY = "birthday"
    ANNIVERSARY = "anniversary"
    BUSINESS = "business"
    ENGAGEMENT = "engagement"
    OTHER = "other"


class Reservation(AuditMixin, Base):
    """Core reservation record linking a guest to a table slot."""

    __tablename__ = "reservations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    idempotency_key: Mapped[str | None] = mapped_column(
        String(128), nullable=True, unique=True, index=True,
        comment="Client-supplied idempotency key for safe retries"
    )

    # Core FK links
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zones.id"), nullable=False, index=True
    )
    table_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tables.id"), nullable=True,
        comment="Assigned at seating; NULL until then"
    )
    guest_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("guest_profiles.id"), nullable=False, index=True
    )

    # Timing
    reserved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    duration_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=90,
        comment="Estimated cover duration; used for availability calculations"
    )
    actual_seated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_departed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Party
    party_size: Mapped[int] = mapped_column(Integer, nullable=False)

    # Status
    status: Mapped[ReservationStatus] = mapped_column(
        Enum(ReservationStatus, name="reservation_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=ReservationStatus.PENDING,
        index=True,
    )

    # Flags
    special_occasion: Mapped[SpecialOccasion | None] = mapped_column(
        Enum(SpecialOccasion, name="special_occasion_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=True
    )
    dietary_tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    guest_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Confirmation
    confirmation_code: Mapped[str | None] = mapped_column(
        String(16), nullable=True, unique=True, index=True
    )
    cancellation_token: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True,
        comment="Tokenized link for self-service cancel/modify"
    )
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Payment hold (Stripe)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    stripe_hold_amount_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stripe_hold_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="RON")
    stripe_hold_captured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Source channel
    source: Mapped[str] = mapped_column(
        String(50), nullable=False, default="direct",
        comment="direct | google_reserve | facebook | tripadvisor | phone | walk_in"
    )
    language: Mapped[str] = mapped_column(String(8), nullable=False, default="ro")

    # Estimated spend (for AI seating optimizer)
    estimated_spend_ron: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    # Relationships
    zone: Mapped["Zone"] = relationship()  # type: ignore[name-defined]
    table: Mapped["Table | None"] = relationship(back_populates="reservations")  # type: ignore[name-defined]
    guest: Mapped["GuestProfile"] = relationship(back_populates="reservations")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<Reservation {self.confirmation_code} {self.status} {self.reserved_at}>"
