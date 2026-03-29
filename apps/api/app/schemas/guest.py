"""Guest profile schemas. PII fields (email, phone) are encrypted server-side;
these schemas work with plaintext on ingress and return masked values on read."""

import uuid
from datetime import datetime

from pydantic import EmailStr, field_validator

from app.schemas.common import OrmBase, TimestampedBase


class GuestProfileCreate(OrmBase):
    venue_id: uuid.UUID
    email: EmailStr | None = None          # Encrypted before persistence
    phone: str | None = None               # Encrypted before persistence
    first_name: str | None = None
    last_name: str | None = None
    language_preference: str = "ro"
    dietary_restrictions: list[str] | None = None
    allergies: list[str] | None = None
    seating_preferences: str | None = None
    gdpr_consent_given: bool = False
    gdpr_consent_scope: str | None = None

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str | None) -> str | None:
        if v:
            return v.strip().replace(" ", "")
        return v


class GuestProfileUpdate(OrmBase):
    first_name: str | None = None
    last_name: str | None = None
    language_preference: str | None = None
    dietary_restrictions: list[str] | None = None
    allergies: list[str] | None = None
    seating_preferences: str | None = None
    internal_notes: str | None = None
    is_vip: bool | None = None
    vip_tags: list[str] | None = None
    gdpr_consent_given: bool | None = None
    gdpr_consent_scope: str | None = None
    gdpr_withdrawal_at: datetime | None = None


class GuestProfileRead(TimestampedBase):
    first_name: str | None
    last_name: str | None
    language_preference: str
    is_vip: bool
    vip_tags: list[str] | None
    dietary_restrictions: list[str] | None
    allergies: list[str] | None
    seating_preferences: str | None
    total_visits: int
    total_no_shows: int
    gdpr_consent_given: bool
    gdpr_consent_at: datetime | None
    gdpr_consent_scope: str | None
    # PII masked in read output — full values available via privileged endpoint
    email_masked: str | None = None   # e.g. "a***@gmail.com"
    phone_masked: str | None = None   # e.g. "+40***1234"
