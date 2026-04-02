"""creative collaborators table

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-02

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "creative_collaborators",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("discipline", sa.String(120), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(512), nullable=True),
        sa.Column("website_url", sa.String(512), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"),
        # AuditMixin
        sa.Column("venue_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_creative_collaborators_discipline", "creative_collaborators", ["discipline"])
    op.create_index("ix_creative_collaborators_is_public", "creative_collaborators", ["is_public"])
    op.create_index("ix_creative_collaborators_venue_id", "creative_collaborators", ["venue_id"])
    op.create_index("ix_creative_collaborators_deleted_at", "creative_collaborators", ["deleted_at"])


def downgrade() -> None:
    op.drop_table("creative_collaborators")
