import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class StaffRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    HOST = "host"
    SERVER = "server"
    BARTENDER = "bartender"
    EXHIBITION_STAFF = "exhibition_staff"
    KITCHEN = "kitchen"


class StaffMember(AuditMixin, Base):
    """Venue staff record linked to auth identity."""

    __tablename__ = "staff_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Auth identity (Clerk user ID or Auth.js sub)
    auth_subject: Mapped[str] = mapped_column(
        String(128), nullable=False, unique=True, index=True
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    role: Mapped[StaffRole] = mapped_column(
        Enum(StaffRole, name="staff_role_enum", values_callable=lambda obj: [e.value for e in obj]), nullable=False, default=StaffRole.SERVER
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Zone assignments (which zones this staff member covers)
    zone_ids: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True, comment="UUID strings of assigned zones"
    )

    # Relationships
    shift_assignments: Mapped[list["ShiftAssignment"]] = relationship(back_populates="staff_member")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<StaffMember {self.first_name} {self.last_name} ({self.role})>"


class ShiftAssignment(AuditMixin, Base):
    """Many-to-many: staff ↔ shift with zone assignment."""

    __tablename__ = "shift_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    shift_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    staff_member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("staff_members.id", ondelete="CASCADE"), nullable=False
    )
    zone_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zones.id"), nullable=True,
        comment="Specific zone assignment within this shift"
    )
    section_label: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="Section identifier e.g. 'A', 'B', 'Bar'"
    )

    # Relationships
    staff_member: Mapped["StaffMember"] = relationship(back_populates="shift_assignments")
    shift: Mapped["Shift"] = relationship(back_populates="assignments")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<ShiftAssignment staff={self.staff_member_id} shift={self.shift_id}>"
