import uuid
from datetime import time

from sqlalchemy import String, Text, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class Venue(AuditMixin, Base):
    """Top-level venue record. All other entities scope to this."""

    __tablename__ = "venues"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False, default="RO")
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Europe/Bucharest")
    default_language: Mapped[str] = mapped_column(String(8), nullable=False, default="ro")

    # Opening hours (venue-level defaults; zones can override)
    opens_at: Mapped[time | None] = mapped_column(Time, nullable=True)
    closes_at: Mapped[time | None] = mapped_column(Time, nullable=True)

    # Relationships
    zones: Mapped[list["Zone"]] = relationship(back_populates="venue", lazy="selectin")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<Venue {self.slug!r}>"
