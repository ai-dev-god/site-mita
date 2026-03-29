"""Shop orders, menu items, and table order items

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-29

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Enums ────────────────────────────────────────────────────────────────
    menu_category_enum = postgresql.ENUM(
        "viennoiserie", "cofetarie", "beverage", "other",
        name="menu_category_enum", create_type=False,
    )
    menu_category_enum.create(op.get_bind(), checkfirst=True)

    # ── menu_items ────────────────────────────────────────────────────────────
    op.create_table(
        "menu_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(
                "viennoiserie", "cofetarie", "beverage", "other",
                name="menu_category_enum", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("price_ron", sa.Numeric(8, 2), nullable=False),
        sa.Column("unit", sa.String(30), nullable=False, server_default="buc"),
        sa.Column("is_available", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("current_qty", sa.Integer, nullable=True),
        sa.Column("threshold_qty", sa.Integer, nullable=False, server_default="5"),
        # AuditMixin
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True, index=True),
    )
    op.create_index("ix_menu_items_venue_id", "menu_items", ["venue_id"])

    # ── table_order_items ─────────────────────────────────────────────────────
    op.create_table(
        "table_order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column(
            "table_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tables.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "menu_item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("menu_items.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("quantity", sa.Integer, nullable=False, server_default="1"),
        sa.Column("unit_price_ron", sa.Numeric(8, 2), nullable=False),
        sa.Column("note", sa.String(300), nullable=True),
        # AuditMixin
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True, index=True),
    )
    op.create_index("ix_table_order_items_table_id", "table_order_items", ["table_id"])
    op.create_index("ix_table_order_items_venue_id", "table_order_items", ["venue_id"])

    # ── shop_orders ───────────────────────────────────────────────────────────
    op.create_table(
        "shop_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column(
            "guest_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("guest_profiles.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("shop_order_id", sa.String(200), nullable=False, unique=True, index=True),
        sa.Column("customer_email", sa.String(512), nullable=True),
        sa.Column("customer_phone", sa.String(512), nullable=True),
        sa.Column("customer_name", sa.String(200), nullable=True),
        sa.Column("total_ron", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="received"),
        sa.Column("items", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("raw_payload", postgresql.JSONB, nullable=True),
        # AuditMixin
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True, index=True),
    )
    op.create_index("ix_shop_orders_venue_id", "shop_orders", ["venue_id"])


def downgrade() -> None:
    op.drop_table("shop_orders")
    op.drop_table("table_order_items")
    op.drop_table("menu_items")
    op.execute("DROP TYPE IF EXISTS menu_category_enum")
