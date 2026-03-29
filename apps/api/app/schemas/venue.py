import uuid
from datetime import time

from pydantic import EmailStr, field_validator

from app.schemas.common import OrmBase, TimestampedBase


class VenueCreate(OrmBase):
    venue_id: uuid.UUID  # Self-referential for the root venue
    name: str
    slug: str
    address: str | None = None
    city: str | None = None
    country_code: str = "RO"
    phone: str | None = None
    email: EmailStr | None = None
    timezone: str = "Europe/Bucharest"
    default_language: str = "ro"
    opens_at: time | None = None
    closes_at: time | None = None

    @field_validator("slug")
    @classmethod
    def slug_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class VenueRead(TimestampedBase):
    name: str
    slug: str
    address: str | None
    city: str | None
    country_code: str
    phone: str | None
    email: str | None
    timezone: str
    default_language: str
    opens_at: time | None
    closes_at: time | None
