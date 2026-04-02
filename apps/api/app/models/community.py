"""Community content models — CulturalEvent, EditorialPost."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import AuditMixin, Base


class CulturalEventType(str, enum.Enum):
    EXHIBITION = "exhibition"
    CINEMA = "cinema"
    BRASSERIE = "brasserie"


class CulturalEvent(AuditMixin, Base):
    """Cultural calendar entry (exhibition, cinema session, brasserie special)."""

    __tablename__ = "cultural_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[CulturalEventType] = mapped_column(
        Enum(
            CulturalEventType,
            name="cultural_event_type_enum",
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        index=True,
    )
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    def __repr__(self) -> str:
        return f"<CulturalEvent {self.title!r} {self.event_type}>"


class EditorialPost(AuditMixin, Base):
    """Member newsletter / editorial post (markdown body)."""

    __tablename__ = "editorial_posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    body: Mapped[str] = mapped_column(Text, nullable=False, comment="Markdown content")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)

    def __repr__(self) -> str:
        return f"<EditorialPost {self.slug!r}>"
