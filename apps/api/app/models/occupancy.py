"""Occupancy events table — designed as a TimescaleDB hypertable.

Stores per-zone headcount snapshots from UniFi Protect camera analytics.
The `time` column is the hypertable partition key.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OccupancyEvent(Base):
    """Per-zone headcount snapshot from a camera or manual override.

    Venue-scoped (venue_id) but NOT using AuditMixin — this table has no
    soft-delete semantics and skips the onupdate overhead of AuditMixin.
    """

    __tablename__ = "occupancy_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Hypertable partition key
    time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="Partition key for TimescaleDB hypertable",
    )

    venue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="Multi-venue scoping key",
    )
    zone_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("zones.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Venue zone; NULL = venue-level aggregate",
    )

    # UniFi Protect source identifiers
    camera_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        comment="UniFi Protect camera MAC / device ID",
    )
    unifi_zone_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="UniFi Protect zone index on the camera (0-based)",
    )

    # Measurement
    headcount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Number of people detected in the zone at this timestamp",
    )
    source: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="unifi_protect",
        comment="Data origin: 'unifi_protect' | 'manual'",
    )

    __table_args__ = (
        Index("ix_occupancy_events_time_zone", "time", "zone_id"),
        Index("ix_occupancy_events_time_venue", "time", "venue_id"),
    )

    def __repr__(self) -> str:
        return f"<OccupancyEvent zone={self.zone_id} headcount={self.headcount} time={self.time}>"
