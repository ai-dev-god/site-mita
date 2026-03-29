"""Shared Pydantic base and response envelope."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampedBase(OrmBase):
    id: uuid.UUID
    venue_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
