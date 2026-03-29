"""Guests router — /api/v1/guests — Guest CRM with GDPR compliance."""

import uuid
from datetime import datetime, timezone
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.encryption import decrypt_pii, encrypt_pii
from app.core.security import require_admin, require_staff
from app.models.guest import GuestProfile
from app.models.reservation import Reservation, ReservationStatus
from app.schemas.guest import GuestProfileCreate, GuestProfileRead, GuestProfileUpdate

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/guests", tags=["guests"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
StaffDep = Annotated[dict, Depends(require_staff)]
AdminDep = Annotated[dict, Depends(require_admin)]


# ── PII helpers ───────────────────────────────────────────────────────────────

def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:1]}***@{domain}" if local else "***"


def _mask_phone(phone: str) -> str:
    if len(phone) >= 6:
        return f"{phone[:3]}***{phone[-3:]}"
    return "***"


def _enrich_read(guest: GuestProfile) -> GuestProfileRead:
    """Build GuestProfileRead, decrypting PII to masked form."""
    email_masked: str | None = None
    phone_masked: str | None = None
    try:
        if guest.enc_email:
            email_masked = _mask_email(decrypt_pii(guest.enc_email))
    except Exception:
        email_masked = "***"
    try:
        if guest.enc_phone:
            phone_masked = _mask_phone(decrypt_pii(guest.enc_phone))
    except Exception:
        phone_masked = "***"

    return GuestProfileRead(
        id=guest.id,
        venue_id=guest.venue_id,
        created_at=guest.created_at,
        updated_at=guest.updated_at,
        deleted_at=guest.deleted_at,
        first_name=guest.first_name,
        last_name=guest.last_name,
        language_preference=guest.language_preference,
        is_vip=guest.is_vip,
        vip_tags=guest.vip_tags,
        dietary_restrictions=guest.dietary_restrictions,
        allergies=guest.allergies,
        seating_preferences=guest.seating_preferences,
        total_visits=guest.total_visits,
        total_no_shows=guest.total_no_shows,
        gdpr_consent_given=guest.gdpr_consent_given,
        gdpr_consent_at=guest.gdpr_consent_at,
        gdpr_consent_scope=guest.gdpr_consent_scope,
        email_masked=email_masked,
        phone_masked=phone_masked,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=GuestProfileRead,
    summary="Create a guest profile",
)
async def create_guest(body: GuestProfileCreate, db: DbDep, _auth: StaffDep) -> GuestProfileRead:
    """Create a new guest profile, encrypting PII at rest."""
    guest = GuestProfile(
        venue_id=body.venue_id,
        first_name=body.first_name,
        last_name=body.last_name,
        language_preference=body.language_preference,
        dietary_restrictions=body.dietary_restrictions,
        allergies=body.allergies,
        seating_preferences=body.seating_preferences,
        gdpr_consent_given=body.gdpr_consent_given,
        gdpr_consent_scope=body.gdpr_consent_scope,
        gdpr_consent_at=datetime.now(timezone.utc) if body.gdpr_consent_given else None,
        enc_email=encrypt_pii(body.email) if body.email else None,
        enc_phone=encrypt_pii(body.phone) if body.phone else None,
    )
    db.add(guest)
    await db.flush()
    await db.refresh(guest)
    logger.info("guest.created", guest_id=str(guest.id))
    return _enrich_read(guest)


@router.get(
    "/{guest_id}",
    response_model=GuestProfileRead,
    summary="Get a guest profile",
)
async def get_guest(guest_id: uuid.UUID, db: DbDep, _auth: StaffDep) -> GuestProfileRead:
    guest = await _get_active(guest_id, db)
    return _enrich_read(guest)


@router.get(
    "",
    response_model=list[GuestProfileRead],
    summary="Search guest profiles",
)
async def search_guests(
    db: DbDep,
    _auth: StaffDep,
    q: Annotated[str | None, Query(min_length=2, description="Name search term")] = None,
    is_vip: Annotated[bool | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[GuestProfileRead]:
    """Search by first/last name fragment. Phone/email search requires
    server-side decrypt (expensive) — use guest ID when known."""
    filters = [GuestProfile.deleted_at.is_(None)]

    if q:
        term = f"%{q.lower()}%"
        filters.append(
            or_(
                GuestProfile.first_name.ilike(term),
                GuestProfile.last_name.ilike(term),
            )
        )
    if is_vip is not None:
        filters.append(GuestProfile.is_vip == is_vip)

    result = await db.execute(
        select(GuestProfile)
        .where(and_(*filters))
        .order_by(GuestProfile.last_name, GuestProfile.first_name)
        .limit(limit)
        .offset(offset)
    )
    guests = result.scalars().all()
    return [_enrich_read(g) for g in guests]


@router.patch(
    "/{guest_id}",
    response_model=GuestProfileRead,
    summary="Update guest preferences, notes, or VIP tags",
)
async def update_guest(guest_id: uuid.UUID, body: GuestProfileUpdate, db: DbDep, _auth: StaffDep) -> GuestProfileRead:
    guest = await _get_active(guest_id, db)

    updates = body.model_dump(exclude_none=True)

    # Handle consent state transitions
    if "gdpr_consent_given" in updates:
        if updates["gdpr_consent_given"] and not guest.gdpr_consent_given:
            updates["gdpr_consent_at"] = datetime.now(timezone.utc)
        elif not updates["gdpr_consent_given"] and guest.gdpr_consent_given:
            updates["gdpr_withdrawal_at"] = datetime.now(timezone.utc)

    for field, value in updates.items():
        setattr(guest, field, value)

    await db.flush()
    await db.refresh(guest)
    logger.info("guest.updated", guest_id=str(guest_id))
    return _enrich_read(guest)


@router.get(
    "/{guest_id}/visits",
    summary="Visit history for a guest",
)
async def get_guest_visits(
    guest_id: uuid.UUID,
    db: DbDep,
    _auth: StaffDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[dict]:
    """Returns completed/checked-in reservations sorted by date desc."""
    await _get_active(guest_id, db)  # 404 guard

    result = await db.execute(
        select(Reservation)
        .where(
            and_(
                Reservation.guest_id == guest_id,
                Reservation.status.in_([ReservationStatus.COMPLETED, ReservationStatus.CHECKED_IN]),
                Reservation.deleted_at.is_(None),
            )
        )
        .order_by(Reservation.reserved_at.desc())
        .limit(limit)
        .offset(offset)
    )
    reservations = result.scalars().all()
    return [
        {
            "reservation_id": str(r.id),
            "reserved_at": r.reserved_at.isoformat(),
            "party_size": r.party_size,
            "zone_id": str(r.zone_id),
            "status": r.status.value,
            "special_occasion": r.special_occasion.value if r.special_occasion else None,
            "estimated_spend_ron": r.estimated_spend_ron,
            "confirmation_code": r.confirmation_code,
        }
        for r in reservations
    ]


@router.post(
    "/{guest_id}/consent",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Log a GDPR consent update",
)
async def update_consent(
    guest_id: uuid.UUID,
    db: DbDep,
    consent_given: Annotated[bool, Query(description="True to grant, False to withdraw")],
    scope: Annotated[str | None, Query(description="Comma-separated consent scopes")] = None,
) -> None:
    """Record consent grant or withdrawal with timestamp (Romanian GDPR compliance)."""
    guest = await _get_active(guest_id, db)
    now = datetime.now(timezone.utc)

    if consent_given:
        guest.gdpr_consent_given = True
        guest.gdpr_consent_at = now
        guest.gdpr_consent_scope = scope
        guest.gdpr_withdrawal_at = None
    else:
        guest.gdpr_consent_given = False
        guest.gdpr_withdrawal_at = now

    await db.flush()
    logger.info("guest.consent_updated", guest_id=str(guest_id), consent_given=consent_given)


@router.get(
    "/{guest_id}/export",
    summary="GDPR data subject export",
)
async def export_guest_data(guest_id: uuid.UUID, db: DbDep, _auth: StaffDep) -> JSONResponse:
    """Return all personal data held for a guest (GDPR Art. 20 — data portability)."""
    guest = await _get_active(guest_id, db)

    # Decrypt PII for export
    email: str | None = None
    phone: str | None = None
    try:
        if guest.enc_email:
            email = decrypt_pii(guest.enc_email)
    except Exception:
        pass
    try:
        if guest.enc_phone:
            phone = decrypt_pii(guest.enc_phone)
    except Exception:
        pass

    # Fetch all reservations
    res_result = await db.execute(
        select(Reservation).where(
            and_(Reservation.guest_id == guest_id, Reservation.deleted_at.is_(None))
        ).order_by(Reservation.reserved_at)
    )
    reservations = res_result.scalars().all()

    payload = {
        "export_generated_at": datetime.now(timezone.utc).isoformat(),
        "subject": {
            "id": str(guest.id),
            "first_name": guest.first_name,
            "last_name": guest.last_name,
            "email": email,
            "phone": phone,
            "language_preference": guest.language_preference,
            "dietary_restrictions": guest.dietary_restrictions,
            "allergies": guest.allergies,
            "seating_preferences": guest.seating_preferences,
            "is_vip": guest.is_vip,
            "vip_tags": guest.vip_tags,
        },
        "consent": {
            "given": guest.gdpr_consent_given,
            "scope": guest.gdpr_consent_scope,
            "granted_at": guest.gdpr_consent_at.isoformat() if guest.gdpr_consent_at else None,
            "withdrawn_at": guest.gdpr_withdrawal_at.isoformat() if guest.gdpr_withdrawal_at else None,
        },
        "stats": {
            "total_visits": guest.total_visits,
            "total_no_shows": guest.total_no_shows,
        },
        "reservations": [
            {
                "id": str(r.id),
                "reserved_at": r.reserved_at.isoformat(),
                "party_size": r.party_size,
                "status": r.status.value,
                "zone_id": str(r.zone_id),
                "source": r.source,
                "confirmation_code": r.confirmation_code,
            }
            for r in reservations
        ],
    }
    logger.info("guest.gdpr_export", guest_id=str(guest_id))
    return JSONResponse(content=payload)


@router.delete(
    "/{guest_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="GDPR right to erasure — anonymise PII and soft-delete profile",
)
async def erase_guest(guest_id: uuid.UUID, db: DbDep, _auth: AdminDep) -> None:
    """GDPR Art. 17 — Right to erasure.

    - Clears all PII fields (email, phone, name, notes).
    - Records erasure timestamp via soft-delete.
    - Reservation records are retained for financial/operational integrity
      but guest_notes and internal_notes are cleared.
    """
    guest = await _get_active(guest_id, db)
    now = datetime.now(timezone.utc)

    # Anonymise PII
    guest.enc_email = None
    guest.enc_phone = None
    guest.first_name = None
    guest.last_name = None
    guest.seating_preferences = None
    guest.internal_notes = None
    guest.dietary_restrictions = None
    guest.allergies = None
    guest.vip_tags = None
    guest.gdpr_consent_given = False
    guest.gdpr_withdrawal_at = now
    guest.deleted_at = now

    # Clear PII from linked reservations
    res_result = await db.execute(
        select(Reservation).where(
            and_(Reservation.guest_id == guest_id, Reservation.deleted_at.is_(None))
        )
    )
    for r in res_result.scalars().all():
        r.guest_notes = None
        r.internal_notes = None

    await db.flush()
    logger.info("guest.gdpr_erased", guest_id=str(guest_id))


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _get_active(guest_id: uuid.UUID, db: AsyncSession) -> GuestProfile:
    result = await db.execute(
        select(GuestProfile).where(
            and_(GuestProfile.id == guest_id, GuestProfile.deleted_at.is_(None))
        )
    )
    guest = result.scalar_one_or_none()
    if guest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found.")
    return guest
