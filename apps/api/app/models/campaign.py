import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import AuditMixin, Base


class CampaignType(str, enum.Enum):
    POST_VISIT_THANK_YOU = "post_visit_thank_you"
    BIRTHDAY_OFFER = "birthday_offer"
    WIN_BACK = "win_back"                # 30-day lapse
    NEW_MENU = "new_menu"
    EVENT_ANNOUNCEMENT = "event_announcement"
    LOYALTY = "loyalty"
    REFERRAL = "referral"
    NEWSLETTER = "newsletter"
    CUSTOM = "custom"


class CampaignChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CampaignLog(AuditMixin, Base):
    """Marketing campaign record with audience and delivery tracking."""

    __tablename__ = "campaign_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    campaign_type: Mapped[CampaignType] = mapped_column(
        Enum(CampaignType, name="campaign_type_enum"), nullable=False
    )
    channel: Mapped[CampaignChannel] = mapped_column(
        Enum(CampaignChannel, name="campaign_channel_enum"), nullable=False
    )
    status: Mapped[CampaignStatus] = mapped_column(
        Enum(CampaignStatus, name="campaign_status_enum"),
        nullable=False,
        default=CampaignStatus.DRAFT,
        index=True,
    )

    # Audience segmentation
    audience_segment: Mapped[str | None] = mapped_column(
        String(100), nullable=True,
        comment="Segment key e.g. 'vip', 'high_spend', 'lapsed_30d', 'event_attendees'"
    )
    audience_filters: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="JSON-serialized filter criteria"
    )
    audience_tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    # Content
    subject_line: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body_template: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Schedule
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Delivery stats
    recipients_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    delivered_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    opened_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    clicked_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unsubscribed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Attribution
    reservations_attributed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    revenue_attributed_ron: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    is_automated: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False,
        comment="True for trigger-based automated sends"
    )

    def __repr__(self) -> str:
        return f"<CampaignLog {self.name!r} {self.status}>"
