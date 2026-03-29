"""Guest profile service — auto-create profile on first reservation."""

import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import encrypt_pii
from app.models.guest import GuestProfile

logger = structlog.get_logger(__name__)


async def get_or_create_guest(
    db: AsyncSession,
    *,
    venue_id: uuid.UUID,
    email: str | None,
    phone: str | None,
    first_name: str | None = None,
    last_name: str | None = None,
    language_preference: str = "ro",
    gdpr_consent_given: bool = False,
    gdpr_consent_scope: str | None = None,
) -> GuestProfile:
    """Find an existing guest by encrypted email or phone, or create a new profile.

    Matching is done by encrypting the incoming value and comparing; since we use
    AES-GCM with a random nonce per encryption, exact lookup requires scanning or
    a deterministic hash index. For v0.1 we do a full-table decrypt scan only when
    both email and phone are absent (i.e., walk-in with name only). When email or
    phone are provided we use a linear scan — acceptable at LMBSC scale (<10k guests).

    TODO v0.2: add HMAC-SHA256 blind index columns for O(1) lookup.
    """
    if email or phone:
        result = await db.execute(
            select(GuestProfile).where(GuestProfile.deleted_at.is_(None))
        )
        for candidate in result.scalars().all():
            try:
                if email and candidate.enc_email:
                    from app.core.encryption import decrypt_pii
                    if decrypt_pii(candidate.enc_email).lower() == email.lower():
                        return candidate
            except Exception:
                pass
            try:
                if phone and candidate.enc_phone:
                    from app.core.encryption import decrypt_pii
                    if decrypt_pii(candidate.enc_phone) == phone:
                        return candidate
            except Exception:
                pass

    # No match — create new profile
    guest = GuestProfile(
        venue_id=venue_id,
        first_name=first_name,
        last_name=last_name,
        language_preference=language_preference,
        gdpr_consent_given=gdpr_consent_given,
        gdpr_consent_scope=gdpr_consent_scope,
        gdpr_consent_at=datetime.now(timezone.utc) if gdpr_consent_given else None,
        enc_email=encrypt_pii(email) if email else None,
        enc_phone=encrypt_pii(phone) if phone else None,
    )
    db.add(guest)
    await db.flush()
    await db.refresh(guest)
    logger.info("guest.auto_created", guest_id=str(guest.id), venue_id=str(venue_id))
    return guest


async def increment_visit_stats(
    db: AsyncSession,
    *,
    guest_id: uuid.UUID,
    no_show: bool = False,
) -> None:
    """Increment total_visits or total_no_shows after a reservation concludes."""
    guest = await db.get(GuestProfile, guest_id)
    if guest is None:
        return
    if no_show:
        guest.total_no_shows += 1
    else:
        guest.total_visits += 1
    await db.flush()
