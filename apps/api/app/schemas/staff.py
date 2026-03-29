import uuid

from pydantic import EmailStr

from app.models.staff import StaffRole
from app.schemas.common import OrmBase, TimestampedBase


class StaffMemberCreate(OrmBase):
    venue_id: uuid.UUID
    auth_subject: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    role: StaffRole = StaffRole.SERVER
    zone_ids: list[str] | None = None


class StaffMemberUpdate(OrmBase):
    first_name: str | None = None
    last_name: str | None = None
    role: StaffRole | None = None
    is_active: bool | None = None
    zone_ids: list[str] | None = None


class StaffMemberRead(TimestampedBase):
    auth_subject: str
    first_name: str
    last_name: str
    email: str
    phone: str | None
    role: StaffRole
    is_active: bool
    zone_ids: list[str] | None
