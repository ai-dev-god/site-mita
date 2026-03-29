import uuid
from datetime import time

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base

import enum


class ZoneType(str, enum.Enum):
    BRASSERIE = "brasserie"          # Ground floor, walk-in only
    SALON_ISTORIC = "salon_istoric"  # First floor, reservations required
    EXPOZITIE = "expozitie"          # Exhibition space, ticketed entry


class ReservationPolicy(str, enum.Enum):
    WALK_IN_ONLY = "walk_in_only"
    RESERVATION_REQUIRED = "reservation_required"
    TICKETED = "ticketed"


class Zone(AuditMixin, Base):
    """A bookable zone within the venue."""

    __tablename__ = "zones"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    venue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    zone_type: Mapped[ZoneType] = mapped_column(
        Enum(ZoneType, name="zone_type_enum"), nullable=False
    )
    reservation_policy: Mapped[ReservationPolicy] = mapped_column(
        Enum(ReservationPolicy, name="reservation_policy_enum"),
        nullable=False,
        default=ReservationPolicy.WALK_IN_ONLY,
    )

    # Capacity
    total_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_party_size: Mapped[int] = mapped_column(Integer, nullable=False, default=10)

    # Operating hours (override venue defaults per day-of-week not modeled here;
    # use ZoneShift for per-day config)
    opens_at: Mapped[time | None] = mapped_column(Time, nullable=True)
    closes_at: Mapped[time | None] = mapped_column(Time, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    venue: Mapped["Venue"] = relationship(back_populates="zones")  # type: ignore[name-defined]
    tables: Mapped[list["Table"]] = relationship(back_populates="zone", lazy="selectin")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<Zone {self.slug!r} ({self.zone_type})>"
