"""Campaigns router — /api/v1/campaigns.

Marketing automation and loyalty campaigns with audience segmentation.
Auth is intentionally omitted until Clerk env vars are provisioned (LAM-25).
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

import structlog
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import and_, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.core.database import get_db
from app.models.campaign import CampaignChannel, CampaignLog, CampaignStatus, CampaignType
from app.models.guest import GuestProfile
from app.models.reservation import Reservation, ReservationStatus

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

DbDep = Annotated[AsyncSession, Depends(get_db)]

_VISIT_STATUSES = [ReservationStatus.COMPLETED, ReservationStatus.CHECKED_IN]


# ── Schemas ───────────────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    campaign_type: CampaignType
    channel: CampaignChannel
    audience_segment: str | None = None
    subject_line: str | None = Field(None, max_length=255)
    body_template: str | None = None
    scheduled_at: datetime | None = None
    is_automated: bool = False


class CampaignUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    status: CampaignStatus | None = None
    subject_line: str | None = None
    body_template: str | None = None
    scheduled_at: datetime | None = None
    recipients_count: int | None = None
    delivered_count: int | None = None
    opened_count: int | None = None
    clicked_count: int | None = None
    unsubscribed_count: int | None = None
    sent_at: datetime | None = None


class CampaignRead(BaseModel):
    id: uuid.UUID
    name: str
    campaign_type: str
    channel: str
    status: str
    audience_segment: str | None
    subject_line: str | None
    body_template: str | None
    scheduled_at: datetime | None
    sent_at: datetime | None
    recipients_count: int
    delivered_count: int
    opened_count: int
    clicked_count: int
    unsubscribed_count: int
    is_automated: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Segment definitions ───────────────────────────────────────────────────────

_SEGMENTS = [
    {"key": "all", "label": "Toți oaspeții", "description": "Toți oaspeții cu consimțământ marketing"},
    {"key": "vip", "label": "VIP", "description": "Profiluri marcate VIP"},
    {"key": "frequent", "label": "Vizitatori frecvenți", "description": "5+ vizite"},
    {"key": "lapsed_30d", "label": "Inactivi 30 zile", "description": "Nicio vizită în ultimele 30 de zile"},
    {"key": "lapsed_90d", "label": "Inactivi 90 zile", "description": "Nicio vizită în ultimele 90 de zile"},
    {"key": "high_spend", "label": "Cheltuieli mari", "description": "Spend estimat > 500 RON"},
    {"key": "new_guests", "label": "Oaspeți noi", "description": "Prima vizită în ultimele 30 de zile"},
    {"key": "event_attendees", "label": "Participanți la evenimente", "description": "Au rezervat la un eveniment"},
    {"key": "outdoor_preference", "label": "Preferă outdoor", "description": "Rezervări frecvente în zona outdoor"},
]


async def _segment_count(segment_key: str, db: AsyncSession) -> int:
    """Estimate audience size for a given segment."""
    now = datetime.now(timezone.utc)
    base = and_(GuestProfile.deleted_at.is_(None), GuestProfile.gdpr_consent_given.is_(True))

    if segment_key == "all":
        r = await db.execute(select(func.count(GuestProfile.id)).where(base))
        return r.scalar_one()

    if segment_key == "vip":
        r = await db.execute(select(func.count(GuestProfile.id)).where(and_(base, GuestProfile.is_vip.is_(True))))
        return r.scalar_one()

    if segment_key == "frequent":
        r = await db.execute(select(func.count(GuestProfile.id)).where(and_(base, GuestProfile.total_visits >= 5)))
        return r.scalar_one()

    if segment_key == "lapsed_30d":
        cutoff = now - timedelta(days=30)
        lapsed = (
            select(distinct(Reservation.guest_id))
            .where(and_(
                Reservation.status.in_(_VISIT_STATUSES),
                Reservation.reserved_at >= cutoff,
                Reservation.deleted_at.is_(None),
            ))
        )
        r = await db.execute(
            select(func.count(GuestProfile.id))
            .where(and_(base, GuestProfile.total_visits > 0, GuestProfile.id.notin_(lapsed)))
        )
        return r.scalar_one()

    if segment_key == "lapsed_90d":
        cutoff = now - timedelta(days=90)
        lapsed = (
            select(distinct(Reservation.guest_id))
            .where(and_(
                Reservation.status.in_(_VISIT_STATUSES),
                Reservation.reserved_at >= cutoff,
                Reservation.deleted_at.is_(None),
            ))
        )
        r = await db.execute(
            select(func.count(GuestProfile.id))
            .where(and_(base, GuestProfile.total_visits > 0, GuestProfile.id.notin_(lapsed)))
        )
        return r.scalar_one()

    if segment_key == "new_guests":
        cutoff = now - timedelta(days=30)
        first_visit = (
            select(distinct(Reservation.guest_id))
            .where(and_(
                Reservation.status.in_(_VISIT_STATUSES),
                Reservation.reserved_at >= cutoff,
                Reservation.deleted_at.is_(None),
            ))
        )
        r = await db.execute(
            select(func.count(GuestProfile.id))
            .where(and_(base, GuestProfile.total_visits == 1, GuestProfile.id.in_(first_visit)))
        )
        return r.scalar_one()

    if segment_key == "high_spend":
        high_spend_guests = (
            select(distinct(Reservation.guest_id))
            .where(and_(
                Reservation.estimated_spend_ron > 500,
                Reservation.deleted_at.is_(None),
            ))
        )
        r = await db.execute(
            select(func.count(GuestProfile.id))
            .where(and_(base, GuestProfile.id.in_(high_spend_guests)))
        )
        return r.scalar_one()

    # For complex segments, return a rough estimate
    r = await db.execute(select(func.count(GuestProfile.id)).where(base))
    return r.scalar_one()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/segments", summary="List audience segments with counts")
async def list_segments(db: DbDep) -> list[dict]:
    """Return all defined audience segments with estimated recipient counts."""
    out = []
    for seg in _SEGMENTS:
        count = await _segment_count(seg["key"], db)
        out.append({**seg, "count": count})
    return out


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=CampaignRead,
    summary="Create a campaign",
)
async def create_campaign(body: CampaignCreate, db: DbDep) -> CampaignRead:
    campaign = CampaignLog(
        name=body.name,
        campaign_type=body.campaign_type,
        channel=body.channel,
        status=CampaignStatus.DRAFT,
        audience_segment=body.audience_segment,
        subject_line=body.subject_line,
        body_template=body.body_template,
        scheduled_at=body.scheduled_at,
        is_automated=body.is_automated,
    )
    db.add(campaign)
    await db.flush()
    await db.refresh(campaign)
    logger.info("campaign.created", campaign_id=str(campaign.id), name=campaign.name)
    return CampaignRead.model_validate(campaign)


@router.get("", response_model=list[CampaignRead], summary="List campaigns")
async def list_campaigns(
    db: DbDep,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    campaign_type: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[CampaignRead]:
    filters: list = [CampaignLog.deleted_at.is_(None)]
    if status_filter:
        filters.append(CampaignLog.status == status_filter)
    if campaign_type:
        filters.append(CampaignLog.campaign_type == campaign_type)

    result = await db.execute(
        select(CampaignLog)
        .where(and_(*filters))
        .order_by(CampaignLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    campaigns = result.scalars().all()
    return [CampaignRead.model_validate(c) for c in campaigns]


@router.get("/{campaign_id}", response_model=CampaignRead, summary="Get a campaign")
async def get_campaign(campaign_id: uuid.UUID, db: DbDep) -> CampaignRead:
    campaign = await _get_campaign(campaign_id, db)
    return CampaignRead.model_validate(campaign)


@router.patch("/{campaign_id}", response_model=CampaignRead, summary="Update campaign")
async def update_campaign(
    campaign_id: uuid.UUID, body: CampaignUpdate, db: DbDep
) -> CampaignRead:
    campaign = await _get_campaign(campaign_id, db)

    updates = body.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(campaign, field, value)

    # Auto-set sent_at when transitioning to completed
    if body.status == CampaignStatus.COMPLETED and not campaign.sent_at:
        campaign.sent_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(campaign)
    logger.info("campaign.updated", campaign_id=str(campaign_id), status=campaign.status)
    return CampaignRead.model_validate(campaign)


@router.post(
    "/{campaign_id}/send",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger campaign send (stub — queues for delivery)",
)
async def send_campaign(campaign_id: uuid.UUID, db: DbDep) -> dict:
    """Mark campaign as running. Actual delivery via Twilio/Resend (LAM-26)."""
    campaign = await _get_campaign(campaign_id, db)

    if campaign.status not in (CampaignStatus.DRAFT, CampaignStatus.SCHEDULED):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Campaign is {campaign.status.value}, cannot send.",
        )

    campaign.status = CampaignStatus.RUNNING
    await db.flush()
    await db.refresh(campaign)
    logger.info("campaign.send_triggered", campaign_id=str(campaign_id), name=campaign.name)

    return {
        "queued": True,
        "campaign_id": str(campaign.id),
        "name": campaign.name,
        "channel": campaign.channel.value,
        "audience_segment": campaign.audience_segment,
        "note": "Delivery integration pending LAM-26 (Twilio/Resend).",
    }


# ── Referral codes ─────────────────────────────────────────────────────────────

@router.get("/referral-codes", summary="List active referral codes")
async def list_referral_codes(db: DbDep) -> list[dict]:
    """Return referral-type campaigns that are active or completed."""
    result = await db.execute(
        select(CampaignLog).where(
            and_(
                CampaignLog.campaign_type == CampaignType.REFERRAL,
                CampaignLog.deleted_at.is_(None),
            )
        ).order_by(CampaignLog.created_at.desc()).limit(50)
    )
    campaigns = result.scalars().all()
    return [
        {
            "campaign_id": str(c.id),
            "name": c.name,
            "code": f"MITA-{str(c.id)[:8].upper()}",
            "status": c.status.value,
            "recipients_count": c.recipients_count,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in campaigns
    ]


@router.post(
    "/referral-codes",
    status_code=status.HTTP_201_CREATED,
    summary="Generate a referral campaign",
)
async def create_referral_code(
    name: Annotated[str, Query(min_length=1, max_length=100)],
    db: DbDep,
) -> dict:
    """Create a new referral campaign (invite a friend → complimentary viennoiserie)."""
    campaign = CampaignLog(
        name=name,
        campaign_type=CampaignType.REFERRAL,
        channel=CampaignChannel.SMS,
        status=CampaignStatus.RUNNING,
        body_template=(
            "Bună! Prietena/prietenul tău te invită la La Mița Biciclista. "
            "Folosește codul {code} și vei primi un viennoiserie gratuit la prima vizită! 🥐"
        ),
        is_automated=False,
    )
    db.add(campaign)
    await db.flush()
    await db.refresh(campaign)

    code = f"MITA-{str(campaign.id)[:8].upper()}"
    logger.info("referral.created", campaign_id=str(campaign.id), code=code)
    return {
        "campaign_id": str(campaign.id),
        "code": code,
        "name": name,
        "status": campaign.status.value,
    }


# ── Internal helpers ───────────────────────────────────────────────────────────

async def _get_campaign(campaign_id: uuid.UUID, db: AsyncSession) -> CampaignLog:
    result = await db.execute(
        select(CampaignLog).where(
            and_(CampaignLog.id == campaign_id, CampaignLog.deleted_at.is_(None))
        )
    )
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")
    return campaign
