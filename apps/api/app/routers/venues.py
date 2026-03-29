"""Venues + Zones read endpoints — /api/v1/venues."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.venue import Venue
from app.models.zone import Zone

router = APIRouter(prefix="/venues", tags=["venues"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


class VenueRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    address: str | None
    city: str | None
    phone: str | None
    email: str | None
    timezone: str
    default_language: str


class ZoneRead(BaseModel):
    id: uuid.UUID
    venue_id: uuid.UUID
    name: str
    slug: str
    zone_type: str
    reservation_policy: str
    total_capacity: int
    max_party_size: int


@router.get("", response_model=list[VenueRead], summary="List venues")
async def list_venues(db: DbDep) -> list[Venue]:
    result = await db.execute(select(Venue).order_by(Venue.name))
    return list(result.scalars().all())


@router.get("/{venue_id}/zones", response_model=list[ZoneRead], summary="List active zones")
async def list_zones(venue_id: uuid.UUID, db: DbDep) -> list[Zone]:
    result = await db.execute(
        select(Venue).where(Venue.id == venue_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venue not found.")

    result = await db.execute(
        select(Zone)
        .where(Zone.venue_id == venue_id, Zone.is_active.is_(True))
        .order_by(Zone.name)
    )
    return list(result.scalars().all())
