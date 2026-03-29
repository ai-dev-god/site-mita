import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class ShiftType(str, enum.Enum):
    MORNING = "morning"      # 08:00–15:00
    AFTERNOON = "afternoon"  # 12:00–19:00
    EVENING = "evening"      # 17:00–01:00
    FULL_DAY = "full_day"


class Shift(AuditMixin, Base):
    """Operational shift for a given date and zone."""

    __tablename__ = "shifts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False, index=True
    )
    shift_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    shift_type: Mapped[ShiftType] = mapped_column(
        Enum(ShiftType, name="shift_type_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Briefing
    cover_target: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="Expected covers for pre-shift planning"
    )
    briefing_notes: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Auto-generated pre-shift summary"
    )
    incident_log: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Post-shift incident / feedback notes"
    )

    # Relationships
    zone: Mapped["Zone"] = relationship()  # type: ignore[name-defined]
    assignments: Mapped[list["ShiftAssignment"]] = relationship(back_populates="shift")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<Shift {self.shift_date} {self.shift_type} zone={self.zone_id}>"
