import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class WaitlistStatus(str, enum.Enum):
    WAITING = "waiting"
    NOTIFIED = "notified"    # SMS sent: "table ready"
    SEATED = "seated"
    EXPIRED = "expired"      # Did not respond within hold window
    CANCELLED = "cancelled"


class WaitlistEntry(AuditMixin, Base):
    """Brasserie walk-in queue entry."""

    __tablename__ = "waitlist_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zones.id"), nullable=False, index=True
    )
    guest_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("guest_profiles.id"), nullable=True,
        comment="NULL for anonymous walk-ins who haven't been profiled yet"
    )

    # Quick-capture fields (before full profile creation)
    guest_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    enc_guest_phone: Mapped[str | None] = mapped_column(
        String(512), nullable=True, comment="AES-256-GCM encrypted phone for SMS"
    )

    party_size: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    dietary_tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    # Queue management
    queue_position: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    estimated_wait_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    seated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    table_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tables.id"), nullable=True
    )

    status: Mapped[WaitlistStatus] = mapped_column(
        Enum(WaitlistStatus, name="waitlist_status_enum"),
        nullable=False,
        default=WaitlistStatus.WAITING,
        index=True,
    )

    # QR self-join token
    qr_token: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True, index=True
    )

    # Relationships
    zone: Mapped["Zone"] = relationship()  # type: ignore[name-defined]
    guest: Mapped["GuestProfile | None"] = relationship()  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<WaitlistEntry #{self.queue_position} party={self.party_size} {self.status}>"
