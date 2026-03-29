"""Shop integration router — inbound webhook from shop.lamitabiciclista.ro.

Routes (mounted at /api/v1):
  POST /shop/orders       — receive shop order, sync to guest CRM profile
  GET  /shop/orders       — list synced shop orders (staff only)
"""

import uuid
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.encryption import decrypt_pii, encrypt_pii
from app.core.security import require_staff
from app.models.guest import GuestProfile
from app.models.shop import ShopOrder
from app.services.guest_service import get_or_create_guest

logger = structlog.get_logger(__name__)
_settings = get_settings()

router = APIRouter(prefix="/shop", tags=["shop"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
StaffDep = Annotated[dict, Depends(require_staff)]


# ── Schemas ───────────────────────────────────────────────────────────────────

class ShopOrderItem(BaseModel):
    name: str
    qty: int = Field(ge=1)
    price_ron: float = Field(ge=0)


class ShopWebhookPayload(BaseModel):
    """Payload sent by shop.lamitabiciclista.ro on each new or updated order."""
    order_id: str = Field(description="External order ID — used as idempotency key")
    venue_id: uuid.UUID
    customer_name: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None
    total_ron: float = Field(ge=0)
    status: str = Field(default="received")
    items: list[ShopOrderItem] = Field(default_factory=list)


class ShopOrderRead(BaseModel):
    id: uuid.UUID
    venue_id: uuid.UUID
    guest_id: uuid.UUID | None
    shop_order_id: str
    customer_name: str | None
    total_ron: float
    status: str
    items: list[dict]
    created_at: str

    class Config:
        from_attributes = True


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post(
    "/orders",
    status_code=status.HTTP_201_CREATED,
    summary="Inbound shop order webhook — syncs to guest CRM",
)
async def receive_shop_order(
    body: ShopWebhookPayload,
    db: DbDep,
    x_shop_secret: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Receive an order from shop.lamitabiciclista.ro and link it to a guest CRM profile.

    - Matches guest by email or phone (encrypted PII scan).
    - Upserts the ShopOrder record (idempotent via shop_order_id).
    - If no guest match, stores the order unlinked (guest_id=NULL) for manual CRM merge.
    """
    # Webhook secret check (optional but recommended — set SHOP_WEBHOOK_SECRET in env)
    expected_secret = getattr(_settings, "shop_webhook_secret", None)
    if expected_secret:
        secret_val = expected_secret.get_secret_value() if hasattr(expected_secret, "get_secret_value") else expected_secret
        if secret_val and x_shop_secret != secret_val:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid webhook secret.")

    # Idempotency: return existing record if already processed
    existing = await db.scalar(
        select(ShopOrder).where(ShopOrder.shop_order_id == body.order_id)
    )
    if existing is not None:
        # Update status if it changed
        if existing.status != body.status:
            existing.status = body.status
            await db.flush()
            logger.info("shop_order.status_updated", shop_order_id=body.order_id, status=body.status)
        return {"id": str(existing.id), "guest_id": str(existing.guest_id) if existing.guest_id else None, "action": "updated"}

    # Try to link to existing guest CRM profile
    guest_id: uuid.UUID | None = None
    if body.customer_email or body.customer_phone:
        all_guests = (await db.execute(
            select(GuestProfile).where(GuestProfile.deleted_at.is_(None))
        )).scalars().all()

        for candidate in all_guests:
            try:
                if body.customer_email and candidate.enc_email:
                    if decrypt_pii(candidate.enc_email).lower() == body.customer_email.lower():
                        guest_id = candidate.id
                        break
            except Exception:
                pass
            try:
                if body.customer_phone and candidate.enc_phone:
                    if decrypt_pii(candidate.enc_phone) == body.customer_phone:
                        guest_id = candidate.id
                        break
            except Exception:
                pass

    # Encrypt customer PII for storage
    enc_email = encrypt_pii(body.customer_email) if body.customer_email else None
    enc_phone = encrypt_pii(body.customer_phone) if body.customer_phone else None

    order = ShopOrder(
        venue_id=body.venue_id,
        guest_id=guest_id,
        shop_order_id=body.order_id,
        customer_name=body.customer_name,
        customer_email=enc_email,
        customer_phone=enc_phone,
        total_ron=body.total_ron,
        status=body.status,
        items=[item.model_dump() for item in body.items],
        raw_payload=body.model_dump(mode="json"),
    )
    db.add(order)
    await db.flush()
    await db.refresh(order)

    logger.info(
        "shop_order.received",
        shop_order_id=body.order_id,
        guest_id=str(guest_id) if guest_id else None,
        linked=guest_id is not None,
    )
    return {"id": str(order.id), "guest_id": str(guest_id) if guest_id else None, "action": "created"}


@router.get(
    "/orders",
    response_model=list[dict],
    summary="List shop orders (staff only)",
)
async def list_shop_orders(
    db: DbDep,
    _auth: StaffDep,
    venue_id: uuid.UUID | None = None,
    guest_id: uuid.UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[dict[str, Any]]:
    """Return shop orders, optionally filtered by venue or guest."""
    filters = [ShopOrder.deleted_at.is_(None)]
    if venue_id:
        filters.append(ShopOrder.venue_id == venue_id)
    if guest_id:
        filters.append(ShopOrder.guest_id == guest_id)

    rows = (
        await db.execute(
            select(ShopOrder)
            .where(and_(*filters))
            .order_by(ShopOrder.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).scalars().all()

    return [
        {
            "id": str(o.id),
            "venue_id": str(o.venue_id),
            "guest_id": str(o.guest_id) if o.guest_id else None,
            "shop_order_id": o.shop_order_id,
            "customer_name": o.customer_name,
            "total_ron": float(o.total_ron),
            "status": o.status,
            "items": o.items,
            "created_at": o.created_at.isoformat(),
        }
        for o in rows
    ]


@router.patch(
    "/orders/{order_id}/link-guest",
    summary="Manually link a shop order to a guest CRM profile (staff only)",
)
async def link_shop_order_to_guest(
    order_id: uuid.UUID,
    guest_id: uuid.UUID,
    db: DbDep,
    _auth: StaffDep,
) -> dict[str, Any]:
    """Manual CRM merge — assign a guest profile to an unlinked shop order."""
    order = await db.scalar(
        select(ShopOrder).where(ShopOrder.id == order_id, ShopOrder.deleted_at.is_(None))
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop order not found.")

    guest = await db.scalar(
        select(GuestProfile).where(GuestProfile.id == guest_id, GuestProfile.deleted_at.is_(None))
    )
    if guest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found.")

    order.guest_id = guest_id
    await db.flush()
    logger.info("shop_order.linked", order_id=str(order_id), guest_id=str(guest_id))
    return {"id": str(order_id), "guest_id": str(guest_id)}
