"""Menu models — cofetărie/viennoiserie items and table-level order checks."""

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class MenuCategory(str, enum.Enum):
    VIENNOISERIE = "viennoiserie"
    COFETARIE = "cofetarie"
    BEVERAGE = "beverage"
    OTHER = "other"


class MenuItem(AuditMixin, Base):
    """A cofetărie/viennoiserie item available for on-premise ordering."""

    __tablename__ = "menu_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[MenuCategory] = mapped_column(
        Enum(MenuCategory, name="menu_category_enum", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=MenuCategory.COFETARIE,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_ron: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    unit: Mapped[str] = mapped_column(
        String(30), nullable=False, default="buc", comment="Unit label, e.g. buc, porție"
    )
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Inventory tracking for low-stock alerts
    current_qty: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="NULL means no inventory tracking"
    )
    threshold_qty: Mapped[int] = mapped_column(
        Integer, nullable=False, default=5, comment="Alert threshold"
    )

    order_items: Mapped[list["TableOrderItem"]] = relationship(back_populates="menu_item")

    def __repr__(self) -> str:
        return f"<MenuItem {self.id} {self.name}>"


class TableOrderItem(AuditMixin, Base):
    """An item attached to a table's running check."""

    __tablename__ = "table_order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    table_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tables.id", ondelete="CASCADE"), nullable=False, index=True
    )
    menu_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("menu_items.id", ondelete="RESTRICT"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price_ron: Mapped[float] = mapped_column(
        Numeric(8, 2), nullable=False, comment="Snapshot of price at time of order"
    )
    note: Mapped[str | None] = mapped_column(String(300), nullable=True)

    menu_item: Mapped["MenuItem"] = relationship(back_populates="order_items")

    def __repr__(self) -> str:
        return f"<TableOrderItem {self.id} table={self.table_id} item={self.menu_item_id}>"
