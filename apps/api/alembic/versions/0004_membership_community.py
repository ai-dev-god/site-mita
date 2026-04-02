"""membership and community content tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-02

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Enums ─────────────────────────────────────────────────────────────────
    member_tier_enum = sa.Enum("free", "friend", "patron", name="member_tier_enum")
    member_status_enum = sa.Enum("active", "suspended", "cancelled", name="member_status_enum")
    subscription_status_enum = sa.Enum(
        "active", "past_due", "cancelled", "unpaid", "incomplete", "trialing",
        name="subscription_status_enum",
    )
    cultural_event_type_enum = sa.Enum(
        "exhibition", "cinema", "brasserie", name="cultural_event_type_enum"
    )

    member_tier_enum.create(op.get_bind(), checkfirst=True)
    member_status_enum.create(op.get_bind(), checkfirst=True)
    subscription_status_enum.create(op.get_bind(), checkfirst=True)
    cultural_event_type_enum.create(op.get_bind(), checkfirst=True)

    # ── membership_tiers ──────────────────────────────────────────────────────
    op.create_table(
        "membership_tiers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("tier", member_tier_enum, nullable=False),
        sa.Column("price_ron", sa.Numeric(10, 2), nullable=True),
        sa.Column("benefits", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("stripe_price_id", sa.String(128), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        # AuditMixin
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_membership_tiers_tier", "membership_tiers", ["tier"], unique=True)
    op.create_index("ix_membership_tiers_venue_id", "membership_tiers", ["venue_id"])
    op.create_index("ix_membership_tiers_deleted_at", "membership_tiers", ["deleted_at"])

    # ── members ───────────────────────────────────────────────────────────────
    op.create_table(
        "members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(128), nullable=False),
        sa.Column(
            "tier_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("membership_tiers.id"),
            nullable=False,
        ),
        sa.Column("status", member_status_enum, nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        # AuditMixin
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_members_user_id", "members", ["user_id"], unique=True)
    op.create_index("ix_members_status", "members", ["status"])
    op.create_index("ix_members_venue_id", "members", ["venue_id"])
    op.create_index("ix_members_deleted_at", "members", ["deleted_at"])

    # ── member_subscriptions ──────────────────────────────────────────────────
    op.create_table(
        "member_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "member_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("members.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stripe_subscription_id", sa.String(128), nullable=True),
        sa.Column("stripe_customer_id", sa.String(128), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", subscription_status_enum, nullable=False),
        # AuditMixin
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_member_subscriptions_member_id", "member_subscriptions", ["member_id"])
    op.create_index(
        "ix_member_subscriptions_stripe_subscription_id",
        "member_subscriptions",
        ["stripe_subscription_id"],
        unique=True,
    )
    op.create_index("ix_member_subscriptions_status", "member_subscriptions", ["status"])
    op.create_index("ix_member_subscriptions_venue_id", "member_subscriptions", ["venue_id"])
    op.create_index("ix_member_subscriptions_deleted_at", "member_subscriptions", ["deleted_at"])

    # ── cultural_events ───────────────────────────────────────────────────────
    op.create_table(
        "cultural_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("event_type", cultural_event_type_enum, nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(512), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"),
        # AuditMixin
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_cultural_events_event_type", "cultural_events", ["event_type"])
    op.create_index("ix_cultural_events_date", "cultural_events", ["date"])
    op.create_index("ix_cultural_events_is_published", "cultural_events", ["is_published"])
    op.create_index("ix_cultural_events_venue_id", "cultural_events", ["venue_id"])
    op.create_index("ix_cultural_events_deleted_at", "cultural_events", ["deleted_at"])

    # ── editorial_posts ───────────────────────────────────────────────────────
    op.create_table(
        "editorial_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        # AuditMixin
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_editorial_posts_slug", "editorial_posts", ["slug"])
    op.create_index("ix_editorial_posts_published_at", "editorial_posts", ["published_at"])
    op.create_index("ix_editorial_posts_venue_id", "editorial_posts", ["venue_id"])
    op.create_index("ix_editorial_posts_deleted_at", "editorial_posts", ["deleted_at"])


def downgrade() -> None:
    op.drop_table("editorial_posts")
    op.drop_table("cultural_events")
    op.drop_table("member_subscriptions")
    op.drop_table("members")
    op.drop_table("membership_tiers")

    op.execute("DROP TYPE IF EXISTS cultural_event_type_enum")
    op.execute("DROP TYPE IF EXISTS subscription_status_enum")
    op.execute("DROP TYPE IF EXISTS member_status_enum")
    op.execute("DROP TYPE IF EXISTS member_tier_enum")
