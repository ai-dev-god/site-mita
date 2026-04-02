import uuid
from datetime import datetime

from app.models.community import CulturalEventType
from app.schemas.common import OrmBase, TimestampedBase


# ── CulturalEvent ─────────────────────────────────────────────────────────────


class CulturalEventCreate(OrmBase):
    venue_id: uuid.UUID
    title: str
    event_type: CulturalEventType
    date: datetime
    description: str | None = None
    image_url: str | None = None
    is_published: bool = False


class CulturalEventUpdate(OrmBase):
    title: str | None = None
    event_type: CulturalEventType | None = None
    date: datetime | None = None
    description: str | None = None
    image_url: str | None = None
    is_published: bool | None = None


class CulturalEventRead(TimestampedBase):
    title: str
    event_type: CulturalEventType
    date: datetime
    description: str | None
    image_url: str | None
    is_published: bool


# ── EditorialPost ─────────────────────────────────────────────────────────────


class EditorialPostCreate(OrmBase):
    venue_id: uuid.UUID
    title: str
    slug: str
    body: str
    published_at: datetime | None = None
    tags: list[str] = []


class EditorialPostUpdate(OrmBase):
    title: str | None = None
    body: str | None = None
    published_at: datetime | None = None
    tags: list[str] | None = None


class EditorialPostRead(TimestampedBase):
    title: str
    slug: str
    body: str
    published_at: datetime | None
    tags: list[str]
