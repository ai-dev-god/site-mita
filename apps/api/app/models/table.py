import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class TableShape(str, enum.Enum):
    ROUND = "round"
    SQUARE = "square"
    RECTANGLE = "rectangle"
    BOOTH = "booth"
    BAR = "bar"


class TableStatus(str, enum.Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    SEATED = "seated"
    ORDERING = "ordering"
    MAINS_OUT = "mains_out"
    LAST_ROUND = "last_round"
    BILL_REQUESTED = "bill_requested"
    TURNING = "turning"       # Being cleared / reset between covers
    BLOCKED = "blocked"       # Manually taken out of service


class Table(AuditMixin, Base):
    """A physical table in a zone."""

    __tablename__ = "tables"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(20), nullable=False, comment="Display name, e.g. T1, B4")
    shape: Mapped[TableShape] = mapped_column(
        Enum(TableShape, name="table_shape_enum"), nullable=False, default=TableShape.ROUND
    )
    min_covers: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    max_covers: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    status: Mapped[TableStatus] = mapped_column(
        Enum(TableStatus, name="table_status_enum"),
        nullable=False,
        default=TableStatus.AVAILABLE,
    )
    is_combinable: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="Can be joined with adjacent tables"
    )
    is_accessible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="Wheelchair accessible"
    )
    is_outdoor: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Floorplan positioning (pixel coords relative to zone canvas)
    pos_x: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    pos_y: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    rotation: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    zone: Mapped["Zone"] = relationship(back_populates="tables")  # type: ignore[name-defined]
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="table")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<Table {self.label!r} ({self.status})>"
