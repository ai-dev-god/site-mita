"""Menu router — cofetărie items, table checks, kitchen WebSocket.

REST routes (mounted at /api/v1):
  GET    /menu/items                  — list items for a venue
  POST   /menu/items                  — create item (manager+)
  PATCH  /menu/items/{id}             — update item (manager+)
  GET    /tables/{id}/check           — get running check for a table
  POST   /tables/{id}/check           — add item to table check
  DELETE /tables/{id}/check/{item_id} — remove item from table check

WebSocket routes (mounted at /ws):
  WS /ws/kitchen/{venue_id}           — subscribe to kitchen alerts (low-stock)
"""

import asyncio
import json
import uuid
from typing import Annotated, Any

import redis.asyncio as aioredis
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import require_manager, require_staff
from app.models.menu import MenuCategory, MenuItem, TableOrderItem
from app.models.table import Table

logger = structlog.get_logger(__name__)
_settings = get_settings()

router = APIRouter(tags=["menu"])
ws_router = APIRouter(tags=["kitchen"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
StaffDep = Annotated[dict, Depends(require_staff)]
ManagerDep = Annotated[dict, Depends(require_manager)]


def _make_redis() -> aioredis.Redis:  # type: ignore[type-arg]
    return aioredis.from_url(str(_settings.redis_url), decode_responses=True)


def _kitchen_channel(venue_id: uuid.UUID) -> str:
    return f"kitchen:{venue_id}"


async def _broadcast_low_stock(venue_id: uuid.UUID, item: MenuItem) -> None:
    """Publish a low-stock alert to the kitchen channel."""
    payload = {
        "event": "low_stock",
        "item_id": str(item.id),
        "item_name": item.name,
        "current_qty": item.current_qty,
        "threshold_qty": item.threshold_qty,
    }
    r = _make_redis()
    try:
        await r.publish(_kitchen_channel(venue_id), json.dumps(payload))
    finally:
        await r.aclose()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class MenuItemCreate(BaseModel):
    venue_id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    category: MenuCategory = MenuCategory.COFETARIE
    description: str | None = None
    price_ron: float = Field(gt=0)
    unit: str = Field(default="buc", max_length=30)
    is_available: bool = True
    current_qty: int | None = None
    threshold_qty: int = Field(default=5, ge=0)


class MenuItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    category: MenuCategory | None = None
    description: str | None = None
    price_ron: float | None = Field(default=None, gt=0)
    unit: str | None = Field(default=None, max_length=30)
    is_available: bool | None = None
    current_qty: int | None = None
    threshold_qty: int | None = Field(default=None, ge=0)


class AddTableOrderItem(BaseModel):
    menu_item_id: uuid.UUID
    quantity: int = Field(default=1, ge=1)
    note: str | None = Field(default=None, max_length=300)


# ── Menu item helpers ─────────────────────────────────────────────────────────

def _item_to_dict(item: MenuItem) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "venue_id": str(item.venue_id),
        "name": item.name,
        "category": item.category.value,
        "description": item.description,
        "price_ron": float(item.price_ron),
        "unit": item.unit,
        "is_available": item.is_available,
        "current_qty": item.current_qty,
        "threshold_qty": item.threshold_qty,
        "created_at": item.created_at.isoformat(),
    }


# ── Menu item routes ──────────────────────────────────────────────────────────

@router.get("/menu/items", summary="List menu items for a venue")
async def list_menu_items(
    venue_id: uuid.UUID,
    db: DbDep,
    _auth: StaffDep,
    category: Annotated[MenuCategory | None, Query()] = None,
    available_only: Annotated[bool, Query()] = False,
) -> list[dict[str, Any]]:
    filters = [MenuItem.venue_id == venue_id, MenuItem.deleted_at.is_(None)]
    if category:
        filters.append(MenuItem.category == category)
    if available_only:
        filters.append(MenuItem.is_available.is_(True))

    rows = (await db.execute(
        select(MenuItem).where(and_(*filters)).order_by(MenuItem.category, MenuItem.name)
    )).scalars().all()
    return [_item_to_dict(r) for r in rows]


@router.post("/menu/items", status_code=status.HTTP_201_CREATED, summary="Create a menu item (manager+)")
async def create_menu_item(body: MenuItemCreate, db: DbDep, _auth: ManagerDep) -> dict[str, Any]:
    item = MenuItem(
        venue_id=body.venue_id,
        name=body.name,
        category=body.category,
        description=body.description,
        price_ron=body.price_ron,
        unit=body.unit,
        is_available=body.is_available,
        current_qty=body.current_qty,
        threshold_qty=body.threshold_qty,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    logger.info("menu_item.created", item_id=str(item.id), name=item.name)
    return _item_to_dict(item)


@router.patch("/menu/items/{item_id}", summary="Update a menu item (manager+)")
async def update_menu_item(
    item_id: uuid.UUID,
    body: MenuItemUpdate,
    db: DbDep,
    _auth: ManagerDep,
) -> dict[str, Any]:
    item = await db.scalar(
        select(MenuItem).where(MenuItem.id == item_id, MenuItem.deleted_at.is_(None))
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found.")

    updates = body.model_dump(exclude_none=True)
    old_qty = item.current_qty

    for field, value in updates.items():
        setattr(item, field, value)

    await db.flush()
    await db.refresh(item)

    # Trigger low-stock alert if qty dropped below threshold
    new_qty = item.current_qty
    if (
        new_qty is not None
        and old_qty is not None
        and new_qty <= item.threshold_qty
        and (old_qty is None or old_qty > item.threshold_qty)
    ):
        await _broadcast_low_stock(item.venue_id, item)

    logger.info("menu_item.updated", item_id=str(item_id))
    return _item_to_dict(item)


# ── Table check routes ────────────────────────────────────────────────────────

@router.get("/tables/{table_id}/check", summary="Get running check for a table")
async def get_table_check(
    table_id: uuid.UUID,
    db: DbDep,
    _auth: StaffDep,
) -> dict[str, Any]:
    """Return all active order items on a table's current check."""
    table = await db.scalar(
        select(Table).where(Table.id == table_id, Table.deleted_at.is_(None))
    )
    if table is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found.")

    rows = (await db.execute(
        select(TableOrderItem, MenuItem)
        .join(MenuItem, TableOrderItem.menu_item_id == MenuItem.id)
        .where(TableOrderItem.table_id == table_id, TableOrderItem.deleted_at.is_(None))
        .order_by(TableOrderItem.created_at)
    )).all()

    items = [
        {
            "id": str(r.TableOrderItem.id),
            "menu_item_id": str(r.TableOrderItem.menu_item_id),
            "menu_item_name": r.MenuItem.name,
            "menu_item_category": r.MenuItem.category.value,
            "quantity": r.TableOrderItem.quantity,
            "unit_price_ron": float(r.TableOrderItem.unit_price_ron),
            "subtotal_ron": float(r.TableOrderItem.unit_price_ron) * r.TableOrderItem.quantity,
            "note": r.TableOrderItem.note,
            "added_at": r.TableOrderItem.created_at.isoformat(),
        }
        for r in rows
    ]
    total = sum(i["subtotal_ron"] for i in items)

    return {
        "table_id": str(table_id),
        "table_label": table.label,
        "items": items,
        "total_ron": round(total, 2),
    }


@router.post(
    "/tables/{table_id}/check",
    status_code=status.HTTP_201_CREATED,
    summary="Add a cofetărie item to a table check",
)
async def add_to_table_check(
    table_id: uuid.UUID,
    body: AddTableOrderItem,
    db: DbDep,
    _auth: StaffDep,
) -> dict[str, Any]:
    """Attach a menu item to a table's running check and decrement inventory."""
    table = await db.scalar(
        select(Table).where(Table.id == table_id, Table.deleted_at.is_(None))
    )
    if table is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found.")

    menu_item = await db.scalar(
        select(MenuItem).where(
            MenuItem.id == body.menu_item_id,
            MenuItem.deleted_at.is_(None),
            MenuItem.is_available.is_(True),
        )
    )
    if menu_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found or unavailable.")

    # Inventory check
    if menu_item.current_qty is not None and menu_item.current_qty < body.quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Insufficient stock: {menu_item.current_qty} available.",
        )

    order_item = TableOrderItem(
        venue_id=table.venue_id,
        table_id=table_id,
        menu_item_id=body.menu_item_id,
        quantity=body.quantity,
        unit_price_ron=menu_item.price_ron,
        note=body.note,
    )
    db.add(order_item)

    # Decrement inventory
    if menu_item.current_qty is not None:
        menu_item.current_qty -= body.quantity
        # Low-stock alert
        if menu_item.current_qty <= menu_item.threshold_qty:
            await _broadcast_low_stock(table.venue_id, menu_item)
            logger.info(
                "kitchen.low_stock_alert",
                item_id=str(menu_item.id),
                current_qty=menu_item.current_qty,
                threshold=menu_item.threshold_qty,
            )

    await db.flush()
    await db.refresh(order_item)
    logger.info("table_check.item_added", table_id=str(table_id), item_id=str(body.menu_item_id))

    return {
        "id": str(order_item.id),
        "table_id": str(table_id),
        "menu_item_id": str(body.menu_item_id),
        "menu_item_name": menu_item.name,
        "quantity": order_item.quantity,
        "unit_price_ron": float(order_item.unit_price_ron),
        "subtotal_ron": float(order_item.unit_price_ron) * order_item.quantity,
        "note": order_item.note,
        "current_qty_remaining": menu_item.current_qty,
    }


@router.delete(
    "/tables/{table_id}/check/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove an item from a table check (staff only)",
)
async def remove_from_table_check(
    table_id: uuid.UUID,
    item_id: uuid.UUID,
    db: DbDep,
    _auth: StaffDep,
) -> None:
    from datetime import datetime, timezone
    order_item = await db.scalar(
        select(TableOrderItem).where(
            TableOrderItem.id == item_id,
            TableOrderItem.table_id == table_id,
            TableOrderItem.deleted_at.is_(None),
        )
    )
    if order_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found.")

    # Restore inventory
    menu_item = await db.scalar(select(MenuItem).where(MenuItem.id == order_item.menu_item_id))
    if menu_item and menu_item.current_qty is not None:
        menu_item.current_qty += order_item.quantity

    order_item.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    logger.info("table_check.item_removed", table_id=str(table_id), item_id=str(item_id))


# ── Kitchen WebSocket ─────────────────────────────────────────────────────────

@ws_router.websocket("/kitchen/{venue_id}")
async def kitchen_websocket(venue_id: uuid.UUID, websocket: WebSocket) -> None:
    """Subscribe to kitchen alerts (low-stock notifications) for a venue.

    The server forwards Redis pub/sub messages on channel ``kitchen:{venue_id}``
    as JSON text frames.  Clients are expected to reconnect on close.
    """
    await websocket.accept()
    logger.info("kitchen_ws.connected", venue_id=str(venue_id))

    r = _make_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe(_kitchen_channel(venue_id))

    async def _forward() -> None:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])

    async def _watch_disconnect() -> None:
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass

    fwd = asyncio.create_task(_forward())
    disc = asyncio.create_task(_watch_disconnect())
    try:
        await asyncio.wait({fwd, disc}, return_when=asyncio.FIRST_COMPLETED)
    finally:
        fwd.cancel()
        disc.cancel()
        await asyncio.gather(fwd, disc, return_exceptions=True)
        await pubsub.unsubscribe(_kitchen_channel(venue_id))
        await pubsub.aclose()
        await r.aclose()
        logger.info("kitchen_ws.disconnected", venue_id=str(venue_id))
