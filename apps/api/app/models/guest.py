"""GuestProfile model — PII fields encrypted at rest (AES-256-GCM)."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class GuestProfile(AuditMixin, Base):
    """Auto-generated on first reservation; enriched over time."""

    __tablename__ = "guest_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # PII — stored AES-256-GCM encrypted; prefix `enc_` as convention
    enc_email: Mapped[str | None] = mapped_column(
        String(512), nullable=True, comment="AES-256-GCM encrypted email"
    )
    enc_phone: Mapped[str | None] = mapped_column(
        String(512), nullable=True, comment="AES-256-GCM encrypted phone"
    )

    # Non-PII operational fields
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    language_preference: Mapped[str] = mapped_column(String(8), nullable=False, default="ro")

    # VIP / loyalty
    is_vip: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    vip_tags: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True, comment="Custom VIP labels e.g. ['wine-collector', 'press']"
    )

    # Preferences & notes
    dietary_restrictions: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    allergies: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    seating_preferences: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Free-text host note e.g. 'prefers window table'"
    )
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Visit / spend stats (denormalized for fast lookup)
    total_visits: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_no_shows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # GDPR consent log
    gdpr_consent_given: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    gdpr_consent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    gdpr_consent_scope: Mapped[str | None] = mapped_column(
        String(512), nullable=True, comment="Comma-separated consent scopes e.g. 'marketing,analytics'"
    )
    gdpr_withdrawal_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="guest")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<GuestProfile {self.id} {self.first_name} {self.last_name}>"
