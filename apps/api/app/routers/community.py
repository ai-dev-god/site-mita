"""Community router — /api/v1/cultural-events + /api/v1/editorial."""

import uuid
from datetime import datetime, timezone
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin, require_manager
from app.models.community import CulturalEvent, CulturalEventType, EditorialPost
from app.schemas.community import (
    CulturalEventCreate,
    CulturalEventRead,
    CulturalEventUpdate,
    EditorialPostCreate,
    EditorialPostRead,
    EditorialPostUpdate,
)
from app.services import membership_service

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["community"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
ManagerDep = Annotated[dict, Depends(require_manager)]
AdminDep = Annotated[dict, Depends(require_admin)]


# ── Cultural Events (public read, manager write) ──────────────────────────────


@router.get(
    "/cultural-events",
    response_model=list[CulturalEventRead],
    summary="List cultural events (public)",
)
async def list_cultural_events(
    db: DbDep,
    venue_id: Annotated[uuid.UUID, Query(description="Venue to list events for")],
    event_type: Annotated[CulturalEventType | None, Query(alias="type")] = None,
    from_date: Annotated[datetime | None, Query(alias="from")] = None,
    to_date: Annotated[datetime | None, Query(alias="to")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[CulturalEvent]:
    filters = [
        CulturalEvent.venue_id == venue_id,
        CulturalEvent.is_published.is_(True),
        CulturalEvent.deleted_at.is_(None),
    ]
    if event_type:
        filters.append(CulturalEvent.event_type == event_type)
    if from_date:
        filters.append(CulturalEvent.date >= from_date)
    if to_date:
        filters.append(CulturalEvent.date <= to_date)

    result = await db.execute(
        select(CulturalEvent)
        .where(and_(*filters))
        .order_by(CulturalEvent.date)
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


@router.get(
    "/cultural-events/{event_id}",
    response_model=CulturalEventRead,
    summary="Get cultural event by ID (public)",
)
async def get_cultural_event(event_id: uuid.UUID, db: DbDep) -> CulturalEvent:
    result = await db.execute(
        select(CulturalEvent).where(
            and_(CulturalEvent.id == event_id, CulturalEvent.deleted_at.is_(None))
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cultural event not found.")
    return event


@router.post(
    "/cultural-events",
    status_code=status.HTTP_201_CREATED,
    response_model=CulturalEventRead,
    summary="Create cultural event (manager)",
)
async def create_cultural_event(body: CulturalEventCreate, db: DbDep, _auth: ManagerDep) -> CulturalEvent:
    event = CulturalEvent(
        venue_id=body.venue_id,
        title=body.title,
        event_type=body.event_type,
        date=body.date,
        description=body.description,
        image_url=body.image_url,
        is_published=body.is_published,
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    logger.info("community.cultural_event.created", event_id=str(event.id), title=event.title)
    return event


@router.patch(
    "/cultural-events/{event_id}",
    response_model=CulturalEventRead,
    summary="Update cultural event (manager)",
)
async def update_cultural_event(
    event_id: uuid.UUID, body: CulturalEventUpdate, db: DbDep, _auth: ManagerDep
) -> CulturalEvent:
    result = await db.execute(
        select(CulturalEvent).where(
            and_(CulturalEvent.id == event_id, CulturalEvent.deleted_at.is_(None))
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cultural event not found.")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(event, field, value)

    await db.flush()
    await db.refresh(event)
    logger.info("community.cultural_event.updated", event_id=str(event_id))
    return event


@router.delete(
    "/cultural-events/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete cultural event (admin)",
)
async def delete_cultural_event(event_id: uuid.UUID, db: DbDep, _auth: AdminDep) -> None:
    result = await db.execute(
        select(CulturalEvent).where(
            and_(CulturalEvent.id == event_id, CulturalEvent.deleted_at.is_(None))
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cultural event not found.")

    event.deleted_at = datetime.now(tz=timezone.utc)
    await db.flush()
    logger.info("community.cultural_event.deleted", event_id=str(event_id))


# ── Editorial Posts (public read, manager write) ──────────────────────────────


@router.get(
    "/editorial",
    response_model=list[EditorialPostRead],
    summary="List published editorial posts (public)",
)
async def list_editorial_posts(
    db: DbDep,
    venue_id: Annotated[uuid.UUID, Query()],
    tag: Annotated[str | None, Query(description="Filter by tag")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[EditorialPost]:
    filters = [
        EditorialPost.venue_id == venue_id,
        EditorialPost.published_at.is_not(None),
        EditorialPost.deleted_at.is_(None),
    ]
    if tag:
        filters.append(EditorialPost.tags.contains([tag]))

    result = await db.execute(
        select(EditorialPost)
        .where(and_(*filters))
        .order_by(EditorialPost.published_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


@router.get(
    "/editorial/{slug}",
    response_model=EditorialPostRead,
    summary="Get editorial post by slug (public)",
)
async def get_editorial_post(
    slug: str,
    db: DbDep,
    venue_id: Annotated[uuid.UUID, Query()],
) -> EditorialPost:
    result = await db.execute(
        select(EditorialPost).where(
            and_(
                EditorialPost.slug == slug,
                EditorialPost.venue_id == venue_id,
                EditorialPost.deleted_at.is_(None),
            )
        )
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    return post


@router.post(
    "/editorial",
    status_code=status.HTTP_201_CREATED,
    response_model=EditorialPostRead,
    summary="Create editorial post (manager)",
)
async def create_editorial_post(body: EditorialPostCreate, db: DbDep, _auth: ManagerDep) -> EditorialPost:
    # Slug uniqueness within venue
    existing = await db.execute(
        select(EditorialPost).where(
            and_(
                EditorialPost.slug == body.slug,
                EditorialPost.venue_id == body.venue_id,
                EditorialPost.deleted_at.is_(None),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A post with this slug already exists.",
        )

    post = EditorialPost(
        venue_id=body.venue_id,
        title=body.title,
        slug=body.slug,
        body=body.body,
        published_at=body.published_at,
        tags=body.tags,
    )
    db.add(post)
    await db.flush()
    await db.refresh(post)
    logger.info("community.editorial_post.created", post_id=str(post.id), slug=post.slug)

    if post.published_at is not None:
        await membership_service.trigger_newsletter_update(
            post_slug=post.slug,
            post_title=post.title,
            venue_id=body.venue_id,
        )

    return post


@router.patch(
    "/editorial/{post_id}",
    response_model=EditorialPostRead,
    summary="Update editorial post (manager)",
)
async def update_editorial_post(
    post_id: uuid.UUID, body: EditorialPostUpdate, db: DbDep, _auth: ManagerDep
) -> EditorialPost:
    result = await db.execute(
        select(EditorialPost).where(
            and_(EditorialPost.id == post_id, EditorialPost.deleted_at.is_(None))
        )
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    was_unpublished = post.published_at is None
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(post, field, value)

    await db.flush()
    await db.refresh(post)
    logger.info("community.editorial_post.updated", post_id=str(post_id))

    # Trigger newsletter if post is being published for the first time
    if was_unpublished and post.published_at is not None:
        await membership_service.trigger_newsletter_update(
            post_slug=post.slug,
            post_title=post.title,
            venue_id=post.venue_id,
        )

    return post


@router.delete(
    "/editorial/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete editorial post (admin)",
)
async def delete_editorial_post(post_id: uuid.UUID, db: DbDep, _auth: AdminDep) -> None:
    result = await db.execute(
        select(EditorialPost).where(
            and_(EditorialPost.id == post_id, EditorialPost.deleted_at.is_(None))
        )
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    post.deleted_at = datetime.now(tz=timezone.utc)
    await db.flush()
    logger.info("community.editorial_post.deleted", post_id=str(post_id))
