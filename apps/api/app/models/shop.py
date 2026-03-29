"""ShopOrder model — orders synced from shop.lamitabiciclista.ro."""

import uuid

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AuditMixin, Base


class ShopOrder(AuditMixin, Base):
    """Inbound order from the online viennoiserie shop, linked to a guest CRM profile."""

    __tablename__ = "shop_orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Optional guest link — resolved by email/phone match, NULL if no profile yet
    guest_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("guest_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # External shop order identifier (idempotency key)
    shop_order_id: Mapped[str] = mapped_column(
        String(200), nullable=False, unique=True, index=True,
        comment="External order ID from shop.lamitabiciclista.ro"
    )
    customer_email: Mapped[str | None] = mapped_column(
        String(512), nullable=True, comment="AES-256-GCM encrypted customer email"
    )
    customer_phone: Mapped[str | None] = mapped_column(
        String(512), nullable=True, comment="AES-256-GCM encrypted customer phone"
    )
    customer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    total_ron: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="received",
        comment="Order status from shop: received, processing, shipped, delivered"
    )
    items: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=list,
        comment="Array of {name, qty, price_ron} from the shop payload"
    )
    raw_payload: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, comment="Full raw webhook payload for debugging"
    )

    guest: Mapped["GuestProfile | None"] = relationship("GuestProfile")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<ShopOrder {self.id} shop_order_id={self.shop_order_id}>"
