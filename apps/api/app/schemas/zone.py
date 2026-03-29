import uuid
from datetime import time

from app.models.zone import ReservationPolicy, ZoneType
from app.schemas.common import OrmBase, TimestampedBase


class ZoneCreate(OrmBase):
    venue_id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    zone_type: ZoneType
    reservation_policy: ReservationPolicy = ReservationPolicy.WALK_IN_ONLY
    total_capacity: int = 0
    max_party_size: int = 10
    opens_at: time | None = None
    closes_at: time | None = None
    is_active: bool = True


class ZoneRead(TimestampedBase):
    name: str
    slug: str
    description: str | None
    zone_type: ZoneType
    reservation_policy: ReservationPolicy
    total_capacity: int
    max_party_size: int
    opens_at: time | None
    closes_at: time | None
    is_active: bool
