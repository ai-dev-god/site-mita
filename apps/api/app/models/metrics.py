"""Time-series metrics table — designed as a TimescaleDB hypertable.

The `time` column is the hypertable partition key. The Alembic migration
calls `create_hypertable` after the regular table DDL.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import AuditMixin, Base


class TableTurnMetric(AuditMixin, Base):
    """Per-cover turn-time and spend data point — TimescaleDB hypertable."""

    __tablename__ = "table_turn_metrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Hypertable partition key — MUST be part of primary key in TimescaleDB
    time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True,
        comment="Partition key for TimescaleDB hypertable"
    )

    table_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tables.id"), nullable=False, index=True
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zones.id"), nullable=False
    )
    reservation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reservations.id"), nullable=True
    )

    # Measurements
    party_size: Mapped[int] = mapped_column(Integer, nullable=False)
    turn_time_minutes: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="Actual minutes from seated to departed"
    )
    covers_per_hour: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    spend_ron: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    spend_per_cover_ron: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)

    shift_type: Mapped[str | None] = mapped_column(String(30), nullable=True)

    __table_args__ = (
        Index("ix_table_turn_metrics_time_zone", "time", "zone_id"),
        Index("ix_table_turn_metrics_time_table", "time", "table_id"),
    )

    def __repr__(self) -> str:
        return f"<TableTurnMetric table={self.table_id} time={self.time}>"
