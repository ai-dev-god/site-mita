import uuid
from datetime import datetime

from app.models.membership import MemberStatus, MemberTier, SubscriptionStatus
from app.schemas.common import OrmBase, TimestampedBase


# ── MembershipTier ────────────────────────────────────────────────────────────


class MembershipTierRead(TimestampedBase):
    name: str
    tier: MemberTier
    price_ron: float | None
    benefits: dict
    stripe_price_id: str | None
    is_active: bool


# ── Member ────────────────────────────────────────────────────────────────────


class MemberRead(TimestampedBase):
    user_id: str
    tier_id: uuid.UUID
    status: MemberStatus
    joined_at: datetime
    display_name: str | None
    bio: str | None
    membership_tier: MembershipTierRead


class MemberUpdate(OrmBase):
    display_name: str | None = None
    bio: str | None = None


# ── Subscription ──────────────────────────────────────────────────────────────


class SubscriptionRead(TimestampedBase):
    member_id: uuid.UUID
    stripe_subscription_id: str | None
    stripe_customer_id: str | None
    current_period_end: datetime | None
    status: SubscriptionStatus


# ── Subscribe request ─────────────────────────────────────────────────────────


class SubscribeRequest(OrmBase):
    venue_id: uuid.UUID
    tier: MemberTier
    success_url: str
    cancel_url: str


class SubscribeResponse(OrmBase):
    checkout_url: str | None
    subscription: SubscriptionRead | None
    message: str
