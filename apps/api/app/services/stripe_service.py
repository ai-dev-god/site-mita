"""Stripe service — credit card hold (payment intent) for no-show protection.

v0.1: structured stubs that log intent.
v0.2: wire up real stripe.PaymentIntent calls.
"""

from uuid import UUID

import structlog

logger = structlog.get_logger(__name__)


async def create_no_show_hold(
    *,
    reservation_id: UUID,
    amount_cents: int,
    currency: str = "RON",
    customer_email: str | None = None,
) -> str | None:
    """Create a Stripe PaymentIntent with capture_method=manual for no-show hold.

    Returns payment_intent_id or None on failure.

    TODO v0.2: implement with stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=currency.lower(),
        capture_method="manual",
        payment_method_types=["card"],
        metadata={"reservation_id": str(reservation_id)},
    )
    """
    logger.info(
        "stripe.hold.create",
        reservation_id=str(reservation_id),
        amount_cents=amount_cents,
        currency=currency,
        customer_email=customer_email,
    )
    # Return None until real integration is wired
    return None


async def capture_no_show_hold(
    *,
    payment_intent_id: str,
    reservation_id: UUID,
) -> bool:
    """Capture a previously authorised hold after a confirmed no-show.

    Returns True on success.

    TODO v0.2: stripe.PaymentIntent.capture(payment_intent_id)
    """
    logger.info(
        "stripe.hold.capture",
        payment_intent_id=payment_intent_id,
        reservation_id=str(reservation_id),
    )
    return False


async def cancel_no_show_hold(
    *,
    payment_intent_id: str,
    reservation_id: UUID,
) -> bool:
    """Cancel (release) a hold when the guest cancels in time.

    TODO v0.2: stripe.PaymentIntent.cancel(payment_intent_id)
    """
    logger.info(
        "stripe.hold.cancel",
        payment_intent_id=payment_intent_id,
        reservation_id=str(reservation_id),
    )
    return True
