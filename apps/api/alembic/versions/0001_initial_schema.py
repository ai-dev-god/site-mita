"""Initial schema — all core LMBSC entities

Revision ID: 0001
Revises:
Create Date: 2026-03-29

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Enums ────────────────────────────────────────────────────────────────
    zone_type_enum = postgresql.ENUM(
        "brasserie", "salon_istoric", "expozitie", name="zone_type_enum", create_type=False
    )
    reservation_policy_enum = postgresql.ENUM(
        "walk_in_only", "reservation_required", "ticketed",
        name="reservation_policy_enum", create_type=False,
    )
    table_shape_enum = postgresql.ENUM(
        "round", "square", "rectangle", "booth", "bar",
        name="table_shape_enum", create_type=False,
    )
    table_status_enum = postgresql.ENUM(
        "available", "reserved", "seated", "ordering", "mains_out",
        "last_round", "bill_requested", "turning", "blocked",
        name="table_status_enum", create_type=False,
    )
    reservation_status_enum = postgresql.ENUM(
        "pending", "confirmed", "checked_in", "completed",
        "cancelled_by_guest", "cancelled_by_venue", "no_show", "waitlisted",
        name="reservation_status_enum", create_type=False,
    )
    special_occasion_enum = postgresql.ENUM(
        "birthday", "anniversary", "business", "engagement", "other",
        name="special_occasion_enum", create_type=False,
    )
    staff_role_enum = postgresql.ENUM(
        "admin", "manager", "host", "server", "bartender", "exhibition_staff", "kitchen",
        name="staff_role_enum", create_type=False,
    )
    shift_type_enum = postgresql.ENUM(
        "morning", "afternoon", "evening", "full_day",
        name="shift_type_enum", create_type=False,
    )
    waitlist_status_enum = postgresql.ENUM(
        "waiting", "notified", "seated", "expired", "cancelled",
        name="waitlist_status_enum", create_type=False,
    )
    event_status_enum = postgresql.ENUM(
        "draft", "published", "sold_out", "cancelled", "completed",
        name="event_status_enum", create_type=False,
    )
    ticket_status_enum = postgresql.ENUM(
        "reserved", "paid", "checked_in", "cancelled", "refunded",
        name="ticket_status_enum", create_type=False,
    )
    campaign_type_enum = postgresql.ENUM(
        "post_visit_thank_you", "birthday_offer", "win_back", "new_menu",
        "event_announcement", "loyalty", "referral", "newsletter", "custom",
        name="campaign_type_enum", create_type=False,
    )
    campaign_channel_enum = postgresql.ENUM(
        "email", "sms", "push", name="campaign_channel_enum", create_type=False
    )
    campaign_status_enum = postgresql.ENUM(
        "draft", "scheduled", "running", "completed", "cancelled",
        name="campaign_status_enum", create_type=False,
    )

    for enum_obj in [
        zone_type_enum, reservation_policy_enum, table_shape_enum, table_status_enum,
        reservation_status_enum, special_occasion_enum, staff_role_enum, shift_type_enum,
        waitlist_status_enum, event_status_enum, ticket_status_enum,
        campaign_type_enum, campaign_channel_enum, campaign_status_enum,
    ]:
        enum_obj.create(op.get_bind(), checkfirst=True)

    # ── venues ───────────────────────────────────────────────────────────────
    op.create_table(
        "venues",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("country_code", sa.String(2), nullable=False, server_default="RO"),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="Europe/Bucharest"),
        sa.Column("default_language", sa.String(8), nullable=False, server_default="ro"),
        sa.Column("opens_at", sa.Time, nullable=True),
        sa.Column("closes_at", sa.Time, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_venues_venue_id", "venues", ["venue_id"])
    op.create_index("ix_venues_deleted_at", "venues", ["deleted_at"])

    # ── zones ────────────────────────────────────────────────────────────────
    op.create_table(
        "zones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("venues.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("zone_type", postgresql.ENUM(name="zone_type_enum", create_type=False), nullable=False),
        sa.Column("reservation_policy", postgresql.ENUM(name="reservation_policy_enum", create_type=False), nullable=False, server_default="walk_in_only"),
        sa.Column("total_capacity", sa.Integer, nullable=False, server_default="0"),
        sa.Column("max_party_size", sa.Integer, nullable=False, server_default="10"),
        sa.Column("opens_at", sa.Time, nullable=True),
        sa.Column("closes_at", sa.Time, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_zones_venue_id", "zones", ["venue_id"])
    op.create_index("ix_zones_deleted_at", "zones", ["deleted_at"])

    # ── tables ───────────────────────────────────────────────────────────────
    op.create_table(
        "tables",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("zones.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(20), nullable=False),
        sa.Column("shape", postgresql.ENUM(name="table_shape_enum", create_type=False), nullable=False, server_default="round"),
        sa.Column("min_covers", sa.Integer, nullable=False, server_default="1"),
        sa.Column("max_covers", sa.Integer, nullable=False, server_default="4"),
        sa.Column("status", postgresql.ENUM(name="table_status_enum", create_type=False), nullable=False, server_default="available"),
        sa.Column("is_combinable", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_accessible", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_outdoor", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("pos_x", sa.Numeric(8, 2), nullable=True),
        sa.Column("pos_y", sa.Numeric(8, 2), nullable=True),
        sa.Column("rotation", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_tables_zone_id", "tables", ["zone_id"])
    op.create_index("ix_tables_venue_id", "tables", ["venue_id"])
    op.create_index("ix_tables_deleted_at", "tables", ["deleted_at"])

    # ── guest_profiles ───────────────────────────────────────────────────────
    op.create_table(
        "guest_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("enc_email", sa.String(512), nullable=True, comment="AES-256-GCM encrypted"),
        sa.Column("enc_phone", sa.String(512), nullable=True, comment="AES-256-GCM encrypted"),
        sa.Column("first_name", sa.String(100), nullable=True),
        sa.Column("last_name", sa.String(100), nullable=True),
        sa.Column("language_preference", sa.String(8), nullable=False, server_default="ro"),
        sa.Column("is_vip", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("vip_tags", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("dietary_restrictions", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("allergies", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("seating_preferences", sa.Text, nullable=True),
        sa.Column("internal_notes", sa.Text, nullable=True),
        sa.Column("total_visits", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_no_shows", sa.Integer, nullable=False, server_default="0"),
        sa.Column("gdpr_consent_given", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("gdpr_consent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("gdpr_consent_scope", sa.String(512), nullable=True),
        sa.Column("gdpr_withdrawal_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_guest_profiles_venue_id", "guest_profiles", ["venue_id"])
    op.create_index("ix_guest_profiles_deleted_at", "guest_profiles", ["deleted_at"])

    # ── reservations ─────────────────────────────────────────────────────────
    op.create_table(
        "reservations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=True, unique=True),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("zones.id"), nullable=False),
        sa.Column("table_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tables.id"), nullable=True),
        sa.Column("guest_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("guest_profiles.id"), nullable=False),
        sa.Column("reserved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer, nullable=False, server_default="90"),
        sa.Column("actual_seated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_departed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("party_size", sa.Integer, nullable=False),
        sa.Column("status", postgresql.ENUM(name="reservation_status_enum", create_type=False), nullable=False, server_default="pending"),
        sa.Column("special_occasion", postgresql.ENUM(name="special_occasion_enum", create_type=False), nullable=True),
        sa.Column("dietary_tags", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("internal_notes", sa.Text, nullable=True),
        sa.Column("guest_notes", sa.Text, nullable=True),
        sa.Column("confirmation_code", sa.String(16), nullable=True, unique=True),
        sa.Column("cancellation_token", sa.String(64), nullable=True, unique=True),
        sa.Column("reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stripe_payment_intent_id", sa.String(128), nullable=True),
        sa.Column("stripe_hold_amount_cents", sa.Integer, nullable=True),
        sa.Column("stripe_hold_currency", sa.String(3), nullable=False, server_default="RON"),
        sa.Column("stripe_hold_captured", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("source", sa.String(50), nullable=False, server_default="direct"),
        sa.Column("language", sa.String(8), nullable=False, server_default="ro"),
        sa.Column("estimated_spend_ron", sa.Numeric(10, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_reservations_venue_id", "reservations", ["venue_id"])
    op.create_index("ix_reservations_zone_id", "reservations", ["zone_id"])
    op.create_index("ix_reservations_guest_id", "reservations", ["guest_id"])
    op.create_index("ix_reservations_reserved_at", "reservations", ["reserved_at"])
    op.create_index("ix_reservations_status", "reservations", ["status"])
    op.create_index("ix_reservations_deleted_at", "reservations", ["deleted_at"])

    # ── staff_members ─────────────────────────────────────────────────────────
    op.create_table(
        "staff_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("auth_subject", sa.String(128), nullable=False, unique=True),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("role", postgresql.ENUM(name="staff_role_enum", create_type=False), nullable=False, server_default="server"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("zone_ids", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_staff_members_venue_id", "staff_members", ["venue_id"])
    op.create_index("ix_staff_members_auth_subject", "staff_members", ["auth_subject"])
    op.create_index("ix_staff_members_deleted_at", "staff_members", ["deleted_at"])

    # ── shifts ────────────────────────────────────────────────────────────────
    op.create_table(
        "shifts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("zones.id", ondelete="CASCADE"), nullable=False),
        sa.Column("shift_date", sa.Date, nullable=False),
        sa.Column("shift_type", postgresql.ENUM(name="shift_type_enum", create_type=False), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cover_target", sa.Integer, nullable=True),
        sa.Column("briefing_notes", sa.Text, nullable=True),
        sa.Column("incident_log", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_shifts_venue_id", "shifts", ["venue_id"])
    op.create_index("ix_shifts_zone_id", "shifts", ["zone_id"])
    op.create_index("ix_shifts_shift_date", "shifts", ["shift_date"])
    op.create_index("ix_shifts_deleted_at", "shifts", ["deleted_at"])

    # ── shift_assignments ─────────────────────────────────────────────────────
    op.create_table(
        "shift_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("shift_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("staff_member_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("staff_members.id", ondelete="CASCADE"), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("zones.id"), nullable=True),
        sa.Column("section_label", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_shift_assignments_venue_id", "shift_assignments", ["venue_id"])
    op.create_index("ix_shift_assignments_shift_id", "shift_assignments", ["shift_id"])
    op.create_index("ix_shift_assignments_deleted_at", "shift_assignments", ["deleted_at"])

    # ── waitlist_entries ──────────────────────────────────────────────────────
    op.create_table(
        "waitlist_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("zones.id"), nullable=False),
        sa.Column("guest_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("guest_profiles.id"), nullable=True),
        sa.Column("guest_name", sa.String(200), nullable=True),
        sa.Column("enc_guest_phone", sa.String(512), nullable=True),
        sa.Column("party_size", sa.Integer, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("dietary_tags", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("queue_position", sa.Integer, nullable=False, server_default="0"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("estimated_wait_minutes", sa.Integer, nullable=True),
        sa.Column("notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("seated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("table_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tables.id"), nullable=True),
        sa.Column("status", postgresql.ENUM(name="waitlist_status_enum", create_type=False), nullable=False, server_default="waiting"),
        sa.Column("qr_token", sa.String(64), nullable=True, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_waitlist_entries_venue_id", "waitlist_entries", ["venue_id"])
    op.create_index("ix_waitlist_entries_zone_id", "waitlist_entries", ["zone_id"])
    op.create_index("ix_waitlist_entries_queue_position", "waitlist_entries", ["queue_position"])
    op.create_index("ix_waitlist_entries_status", "waitlist_entries", ["status"])
    op.create_index("ix_waitlist_entries_qr_token", "waitlist_entries", ["qr_token"])
    op.create_index("ix_waitlist_entries_deleted_at", "waitlist_entries", ["deleted_at"])

    # ── events ────────────────────────────────────────────────────────────────
    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("zones.id"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", postgresql.ENUM(name="event_status_enum", create_type=False), nullable=False, server_default="draft"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("doors_open_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_capacity", sa.Integer, nullable=False),
        sa.Column("tickets_sold", sa.Integer, nullable=False, server_default="0"),
        sa.Column("ticket_price_ron", sa.Numeric(10, 2), nullable=True),
        sa.Column("is_free", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("external_ticket_url", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_events_venue_id", "events", ["venue_id"])
    op.create_index("ix_events_slug", "events", ["slug"])
    op.create_index("ix_events_starts_at", "events", ["starts_at"])
    op.create_index("ix_events_status", "events", ["status"])
    op.create_index("ix_events_deleted_at", "events", ["deleted_at"])

    # ── tickets ───────────────────────────────────────────────────────────────
    op.create_table(
        "tickets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("guest_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("guest_profiles.id"), nullable=True),
        sa.Column("ticket_number", sa.String(32), nullable=False, unique=True),
        sa.Column("qr_code", sa.String(512), nullable=False, unique=True),
        sa.Column("status", postgresql.ENUM(name="ticket_status_enum", create_type=False), nullable=False, server_default="reserved"),
        sa.Column("stripe_payment_intent_id", sa.String(128), nullable=True),
        sa.Column("amount_paid_ron", sa.Numeric(10, 2), nullable=True),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_tickets_venue_id", "tickets", ["venue_id"])
    op.create_index("ix_tickets_event_id", "tickets", ["event_id"])
    op.create_index("ix_tickets_ticket_number", "tickets", ["ticket_number"])
    op.create_index("ix_tickets_status", "tickets", ["status"])
    op.create_index("ix_tickets_deleted_at", "tickets", ["deleted_at"])

    # ── campaign_logs ─────────────────────────────────────────────────────────
    op.create_table(
        "campaign_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("campaign_type", postgresql.ENUM(name="campaign_type_enum", create_type=False), nullable=False),
        sa.Column("channel", postgresql.ENUM(name="campaign_channel_enum", create_type=False), nullable=False),
        sa.Column("status", postgresql.ENUM(name="campaign_status_enum", create_type=False), nullable=False, server_default="draft"),
        sa.Column("audience_segment", sa.String(100), nullable=True),
        sa.Column("audience_filters", sa.Text, nullable=True),
        sa.Column("audience_tags", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("subject_line", sa.String(255), nullable=True),
        sa.Column("body_template", sa.Text, nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recipients_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("delivered_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("opened_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("clicked_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("unsubscribed_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("reservations_attributed", sa.Integer, nullable=False, server_default="0"),
        sa.Column("revenue_attributed_ron", sa.Numeric(12, 2), nullable=True),
        sa.Column("is_automated", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_campaign_logs_venue_id", "campaign_logs", ["venue_id"])
    op.create_index("ix_campaign_logs_status", "campaign_logs", ["status"])
    op.create_index("ix_campaign_logs_deleted_at", "campaign_logs", ["deleted_at"])

    # ── table_turn_metrics (TimescaleDB hypertable) ───────────────────────────
    # TimescaleDB requires the partition column (time) to be part of the primary key
    op.create_table(
        "table_turn_metrics",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("time", sa.DateTime(timezone=True), nullable=False, comment="TimescaleDB partition key"),
        sa.Column("table_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tables.id"), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("zones.id"), nullable=False),
        sa.Column("reservation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("reservations.id"), nullable=True),
        sa.Column("party_size", sa.Integer, nullable=False),
        sa.Column("turn_time_minutes", sa.Integer, nullable=True),
        sa.Column("covers_per_hour", sa.Numeric(6, 2), nullable=True),
        sa.Column("spend_ron", sa.Numeric(10, 2), nullable=True),
        sa.Column("spend_per_cover_ron", sa.Numeric(8, 2), nullable=True),
        sa.Column("shift_type", sa.String(30), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Composite PK required by TimescaleDB: partition key must be in PK
    op.execute("ALTER TABLE table_turn_metrics ADD PRIMARY KEY (id, time)")
    op.create_index("ix_table_turn_metrics_time", "table_turn_metrics", ["time"])
    op.create_index("ix_table_turn_metrics_time_zone", "table_turn_metrics", ["time", "zone_id"])
    op.create_index("ix_table_turn_metrics_time_table", "table_turn_metrics", ["time", "table_id"])
    op.create_index("ix_table_turn_metrics_venue_id", "table_turn_metrics", ["venue_id"])

    # Convert to TimescaleDB hypertable (no-op if TimescaleDB not installed)
    op.execute(
        "SELECT create_hypertable('table_turn_metrics', 'time', "
        "if_not_exists => TRUE, migrate_data => TRUE)"
    )


def downgrade() -> None:
    op.drop_table("table_turn_metrics")
    op.drop_table("campaign_logs")
    op.drop_table("tickets")
    op.drop_table("events")
    op.drop_table("waitlist_entries")
    op.drop_table("shift_assignments")
    op.drop_table("shifts")
    op.drop_table("staff_members")
    op.drop_table("reservations")
    op.drop_table("guest_profiles")
    op.drop_table("tables")
    op.drop_table("zones")
    op.drop_table("venues")

    for enum_name in [
        "zone_type_enum", "reservation_policy_enum", "table_shape_enum",
        "table_status_enum", "reservation_status_enum", "special_occasion_enum",
        "staff_role_enum", "shift_type_enum", "waitlist_status_enum",
        "event_status_enum", "ticket_status_enum",
        "campaign_type_enum", "campaign_channel_enum", "campaign_status_enum",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
