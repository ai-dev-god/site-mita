import uuid
from datetime import datetime

from app.models.campaign import CampaignChannel, CampaignStatus, CampaignType
from app.schemas.common import OrmBase, TimestampedBase


class CampaignLogCreate(OrmBase):
    venue_id: uuid.UUID
    name: str
    campaign_type: CampaignType
    channel: CampaignChannel
    audience_segment: str | None = None
    audience_filters: str | None = None
    audience_tags: list[str] | None = None
    subject_line: str | None = None
    body_template: str | None = None
    scheduled_at: datetime | None = None
    is_automated: bool = False


class CampaignLogUpdate(OrmBase):
    name: str | None = None
    status: CampaignStatus | None = None
    subject_line: str | None = None
    body_template: str | None = None
    scheduled_at: datetime | None = None
    recipients_count: int | None = None
    delivered_count: int | None = None
    opened_count: int | None = None
    clicked_count: int | None = None
    unsubscribed_count: int | None = None
    reservations_attributed: int | None = None
    revenue_attributed_ron: float | None = None


class CampaignLogRead(TimestampedBase):
    name: str
    campaign_type: CampaignType
    channel: CampaignChannel
    status: CampaignStatus
    audience_segment: str | None
    audience_tags: list[str] | None
    subject_line: str | None
    scheduled_at: datetime | None
    sent_at: datetime | None
    recipients_count: int
    delivered_count: int
    opened_count: int
    clicked_count: int
    unsubscribed_count: int
    reservations_attributed: int
    revenue_attributed_ron: float | None
    is_automated: bool
