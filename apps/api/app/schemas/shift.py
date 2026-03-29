import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models.shift import ShiftType
from app.models.staff import StaffRole
from app.schemas.common import OrmBase, TimestampedBase


class ShiftCreate(OrmBase):
    venue_id: uuid.UUID
    zone_id: uuid.UUID
    shift_date: date
    shift_type: ShiftType
    starts_at: datetime
    ends_at: datetime
    cover_target: int | None = None


class ShiftUpdate(OrmBase):
    cover_target: int | None = None
    briefing_notes: str | None = None
    incident_log: str | None = None


class ShiftRead(TimestampedBase):
    zone_id: uuid.UUID
    shift_date: date
    shift_type: ShiftType
    starts_at: datetime
    ends_at: datetime
    cover_target: int | None
    briefing_notes: str | None
    incident_log: str | None


class StaffMemberSummary(OrmBase):
    id: uuid.UUID
    first_name: str
    last_name: str
    role: StaffRole


class ShiftAssignmentRead(OrmBase):
    id: uuid.UUID
    shift_id: uuid.UUID
    staff_member_id: uuid.UUID
    zone_id: uuid.UUID | None
    section_label: str | None
    staff_member: StaffMemberSummary | None = None


class ShiftWithAssignmentsRead(ShiftRead):
    assignments: list[ShiftAssignmentRead] = []


class ShiftAssignmentCreate(OrmBase):
    staff_member_id: uuid.UUID
    zone_id: uuid.UUID | None = None
    section_label: str | None = None


# ── Kitchen pacing ────────────────────────────────────────────────────────────

class PacingBucket(BaseModel):
    bucket_start: datetime
    bucket_end: datetime
    covers: int
    reservations: int


class PacingResponse(BaseModel):
    shift_id: uuid.UUID
    window_start: datetime
    window_end: datetime
    buckets: list[PacingBucket]
    total_covers: int
