import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class EventStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    SOLD_OUT = "sold_out"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class TicketStatus(str, enum.Enum):
    RESERVED = "reserved"
    PAID = "paid"
    CHECKED_IN = "checked_in"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class Event(AuditMixin, Base):
    """Ticketed event (exhibition, private dinner, gallery opening)."""

    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    zone_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zones.id"), nullable=True,
        comment="NULL = venue-wide event"
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, name="event_status_enum"),
        nullable=False,
        default=EventStatus.DRAFT,
        index=True,
    )

    # Timing
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    doors_open_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Capacity
    total_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    tickets_sold: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Ticketing
    ticket_price_ron: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_free: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # External ticket integration
    external_ticket_url: Mapped[str | None] = mapped_column(
        String(512), nullable=True,
        comment="bilete.lamitabiciclista.ro or external provider URL"
    )

    # Relationships
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="event")

    def __repr__(self) -> str:
        return f"<Event {self.name!r} {self.starts_at}>"


class Ticket(AuditMixin, Base):
    """Individual event ticket with QR code."""

    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    guest_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("guest_profiles.id"), nullable=True
    )

    # Ticket identity
    ticket_number: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
    qr_code: Mapped[str] = mapped_column(
        String(512), nullable=False, unique=True,
        comment="Signed QR payload for check-in scanning"
    )

    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status_enum"),
        nullable=False,
        default=TicketStatus.RESERVED,
        index=True,
    )

    # Payment
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    amount_paid_ron: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    event: Mapped["Event"] = relationship(back_populates="tickets")
    guest: Mapped["GuestProfile | None"] = relationship()

    def __repr__(self) -> str:
        return f"<Ticket {self.ticket_number} {self.status}>"
