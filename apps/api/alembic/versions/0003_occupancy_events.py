"""occupancy_events hypertable for UniFi Protect headcount data

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-29

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "occupancy_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "zone_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("zones.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("camera_id", sa.String(128), nullable=True),
        sa.Column("unifi_zone_id", sa.Integer, nullable=True),
        sa.Column("headcount", sa.Integer, nullable=False),
        sa.Column("source", sa.String(32), nullable=False, server_default="unifi_protect"),
    )

    op.create_index("ix_occupancy_events_time", "occupancy_events", ["time"])
    op.create_index("ix_occupancy_events_venue_id", "occupancy_events", ["venue_id"])
    op.create_index("ix_occupancy_events_zone_id", "occupancy_events", ["zone_id"])
    op.create_index("ix_occupancy_events_time_zone", "occupancy_events", ["time", "zone_id"])
    op.create_index("ix_occupancy_events_time_venue", "occupancy_events", ["time", "venue_id"])

    # Promote to TimescaleDB hypertable partitioned on `time`
    op.execute(
        "SELECT create_hypertable('occupancy_events', 'time', "
        "if_not_exists => TRUE, migrate_data => TRUE)"
    )


def downgrade() -> None:
    op.drop_table("occupancy_events")
