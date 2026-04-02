"""Membership models — Member, MembershipTier, Subscription."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class MemberTier(str, enum.Enum):
    FREE = "free"
    FRIEND = "friend"
    PATRON = "patron"


class MemberStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    UNPAID = "unpaid"
    INCOMPLETE = "incomplete"
    TRIALING = "trialing"


class MembershipTier(AuditMixin, Base):
    """Membership tier definition (free, friend, patron)."""

    __tablename__ = "membership_tiers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    tier: Mapped[MemberTier] = mapped_column(
        Enum(MemberTier, name="member_tier_enum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        unique=True,
        index=True,
    )
    price_ron: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True, comment="NULL = free tier")
    benefits: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    stripe_price_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    members: Mapped[list["Member"]] = relationship(back_populates="membership_tier")

    def __repr__(self) -> str:
        return f"<MembershipTier {self.tier}>"


class Member(AuditMixin, Base):
    """Community member profile linked to a Clerk user."""

    __tablename__ = "members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(
        String(128), nullable=False, unique=True, index=True,
        comment="Clerk user ID (sub claim)"
    )
    tier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("membership_tiers.id"), nullable=False
    )
    status: Mapped[MemberStatus] = mapped_column(
        Enum(MemberStatus, name="member_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=MemberStatus.ACTIVE,
        index=True,
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)

    membership_tier: Mapped["MembershipTier"] = relationship(back_populates="members")
    subscriptions: Mapped[list["Subscription"]] = relationship(
        back_populates="member", order_by="Subscription.created_at"
    )

    def __repr__(self) -> str:
        return f"<Member {self.user_id} tier={self.tier_id}>"


class Subscription(AuditMixin, Base):
    """Stripe subscription record for a paid membership tier."""

    __tablename__ = "member_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        String(128), nullable=True, unique=True, index=True
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status_enum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=SubscriptionStatus.INCOMPLETE,
        index=True,
    )

    member: Mapped["Member"] = relationship(back_populates="subscriptions")

    def __repr__(self) -> str:
        return f"<Subscription {self.stripe_subscription_id} {self.status}>"
