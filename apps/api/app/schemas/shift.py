import uuid
from datetime import date, datetime

from app.models.shift import ShiftType
from app.schemas.common import OrmBase, TimestampedBase


class ShiftCreate(OrmBase):
    venue_id: uuid.UUID
    zone_id: uuid.UUID
    shift_date: date
    shift_type: ShiftType
    starts_at: datetime
    ends_at: datetime
    cover_target: int | None = None


class ShiftRead(TimestampedBase):
    zone_id: uuid.UUID
    shift_date: date
    shift_type: ShiftType
    starts_at: datetime
    ends_at: datetime
    cover_target: int | None
    briefing_notes: str | None
    incident_log: str | None


class ShiftAssignmentCreate(OrmBase):
    venue_id: uuid.UUID
    shift_id: uuid.UUID
    staff_member_id: uuid.UUID
    zone_id: uuid.UUID | None = None
    section_label: str | None = None
