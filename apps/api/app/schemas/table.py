import uuid

from pydantic import BaseModel, ConfigDict

from app.models.table import TableShape, TableStatus
from app.schemas.common import OrmBase, TimestampedBase


class TableFloorRead(BaseModel):
    """Enriched table read for the floor-plan dashboard (includes zone_name)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    zone_id: uuid.UUID
    zone_name: str
    label: str
    shape: str
    status: str
    min_covers: int
    max_covers: int
    is_accessible: bool
    is_outdoor: bool
    pos_x: float | None
    pos_y: float | None
    rotation: int


class TableCreate(OrmBase):
    venue_id: uuid.UUID
    zone_id: uuid.UUID
    label: str
    shape: TableShape = TableShape.ROUND
    min_covers: int = 1
    max_covers: int = 4
    is_combinable: bool = False
    is_accessible: bool = False
    is_outdoor: bool = False
    pos_x: float | None = None
    pos_y: float | None = None
    rotation: int = 0


class TableRead(TimestampedBase):
    zone_id: uuid.UUID
    label: str
    shape: TableShape
    min_covers: int
    max_covers: int
    status: TableStatus
    is_combinable: bool
    is_accessible: bool
    is_outdoor: bool
    pos_x: float | None
    pos_y: float | None
    rotation: int


class TableStatusUpdate(OrmBase):
    status: TableStatus
