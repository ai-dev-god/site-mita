"""Membership router — /api/v1/membership/*."""

import uuid
from datetime import datetime, timezone
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import require_staff, verify_clerk_token
from app.models.membership import Member, MembershipTier, MemberStatus, MemberTier, Subscription, SubscriptionStatus
from app.schemas.membership import (
    MemberRead,
    MembershipTierRead,
    MemberUpdate,
    SubscribeRequest,
    SubscribeResponse,
    SubscriptionRead,
)
from app.services import membership_service

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["membership"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
AuthDep = Annotated[dict, Depends(verify_clerk_token)]
StaffDep = Annotated[dict, Depends(require_staff)]


# ── Tiers (public) ────────────────────────────────────────────────────────────


@router.get(
    "/membership/tiers",
    response_model=list[MembershipTierRead],
    summary="List membership tiers (public)",
)
async def list_tiers(
    db: DbDep,
    venue_id: Annotated[uuid.UUID, Query(description="Venue to list tiers for")],
) -> list[MembershipTier]:
    result = await db.execute(
        select(MembershipTier)
        .where(
            and_(
                MembershipTier.venue_id == venue_id,
                MembershipTier.is_active.is_(True),
                MembershipTier.deleted_at.is_(None),
            )
        )
        .order_by(MembershipTier.price_ron.nullsfirst())
    )
    return list(result.scalars().all())


# ── Current member profile ────────────────────────────────────────────────────


@router.get(
    "/membership/me",
    response_model=MemberRead,
    summary="Get current member profile + tier + benefits",
)
async def get_my_profile(db: DbDep, auth: AuthDep) -> Member:
    user_id: str = auth.get("sub", "")
    result = await db.execute(
        select(Member)
        .options(selectinload(Member.membership_tier))
        .where(
            and_(
                Member.user_id == user_id,
                Member.deleted_at.is_(None),
            )
        )
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member profile not found.")
    return member


@router.patch(
    "/membership/me",
    response_model=MemberRead,
    summary="Update current member profile",
)
async def update_my_profile(body: MemberUpdate, db: DbDep, auth: AuthDep) -> Member:
    user_id: str = auth.get("sub", "")
    result = await db.execute(
        select(Member)
        .options(selectinload(Member.membership_tier))
        .where(
            and_(
                Member.user_id == user_id,
                Member.deleted_at.is_(None),
            )
        )
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member profile not found.")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(member, field, value)

    await db.flush()
    await db.refresh(member)
    logger.info("membership.profile.updated", user_id=user_id)
    return member


# ── Subscribe ─────────────────────────────────────────────────────────────────


@router.post(
    "/membership/subscribe",
    response_model=SubscribeResponse,
    status_code=status.HTTP_200_OK,
    summary="Create or upgrade membership subscription via Stripe",
)
async def subscribe(body: SubscribeRequest, db: DbDep, auth: AuthDep) -> SubscribeResponse:
    """Create a Stripe Checkout session for the requested tier.

    - Free tier: no payment required; member record created immediately.
    - Paid tier: returns a Stripe Checkout URL (v0.2 will wire real Stripe).
    """
    user_id: str = auth.get("sub", "")

    # Resolve tier
    tier_result = await db.execute(
        select(MembershipTier).where(
            and_(
                MembershipTier.tier == body.tier,
                MembershipTier.venue_id == body.venue_id,
                MembershipTier.is_active.is_(True),
                MembershipTier.deleted_at.is_(None),
            )
        )
    )
    tier = tier_result.scalar_one_or_none()
    if tier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Membership tier '{body.tier}' not found or inactive.",
        )

    # Find or create Member
    member_result = await db.execute(
        select(Member)
        .options(selectinload(Member.membership_tier))
        .where(and_(Member.user_id == user_id, Member.deleted_at.is_(None)))
    )
    member = member_result.scalar_one_or_none()

    if member is None:
        member = Member(
            venue_id=body.venue_id,
            user_id=user_id,
            tier_id=tier.id,
            status=MemberStatus.ACTIVE,
            joined_at=datetime.now(tz=timezone.utc),
        )
        db.add(member)
        await db.flush()
        await db.refresh(member)
        logger.info("membership.member.created", user_id=user_id, tier=body.tier.value)
    else:
        # Upgrade existing member tier
        member.tier_id = tier.id
        await db.flush()

    # Free tier — no Stripe needed
    if body.tier == MemberTier.FREE or tier.price_ron is None:
        sub = Subscription(
            venue_id=body.venue_id,
            member_id=member.id,
            status=SubscriptionStatus.ACTIVE,
        )
        db.add(sub)
        await db.flush()
        await db.refresh(sub)

        await membership_service.send_welcome_email(
            member_id=member.id,
            email=auth.get("email", ""),
            display_name=member.display_name,
            tier_name=tier.name,
        )

        sub_read = SubscriptionRead.model_validate(sub)
        return SubscribeResponse(
            checkout_url=None,
            subscription=sub_read,
            message="Welcome! Your free membership is active.",
        )

    # Paid tier — create Stripe Checkout session (v0.2)
    if not tier.stripe_price_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe price ID not configured for this tier.",
        )

    sub = Subscription(
        venue_id=body.venue_id,
        member_id=member.id,
        status=SubscriptionStatus.INCOMPLETE,
    )
    db.add(sub)
    await db.flush()
    await db.refresh(sub)

    checkout_url = await membership_service.create_checkout_session(
        member_id=member.id,
        stripe_price_id=tier.stripe_price_id,
        stripe_customer_id=sub.stripe_customer_id,
        success_url=body.success_url,
        cancel_url=body.cancel_url,
    )

    sub_read = SubscriptionRead.model_validate(sub)
    return SubscribeResponse(
        checkout_url=checkout_url,
        subscription=sub_read,
        message="Proceed to checkout to complete your membership.",
    )


# ── Admin: list all members ───────────────────────────────────────────────────


@router.get(
    "/membership/members",
    response_model=list[MemberRead],
    summary="List all members (staff)",
)
async def list_members(
    db: DbDep,
    _auth: StaffDep,
    venue_id: Annotated[uuid.UUID, Query()],
    member_status: Annotated[MemberStatus | None, Query(alias="status")] = None,
    tier: Annotated[MemberTier | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[Member]:
    filters = [Member.venue_id == venue_id, Member.deleted_at.is_(None)]
    if member_status:
        filters.append(Member.status == member_status)
    if tier:
        tier_sub = select(MembershipTier.id).where(MembershipTier.tier == tier)
        filters.append(Member.tier_id.in_(tier_sub))

    result = await db.execute(
        select(Member)
        .options(selectinload(Member.membership_tier))
        .where(and_(*filters))
        .order_by(Member.joined_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())
