"""Membership service — Stripe subscription checkout + welcome email.

v0.1: structured stubs that log intent.
v0.2: wire up real stripe.checkout.Session / stripe.Subscription calls.
"""

from uuid import UUID

import structlog

logger = structlog.get_logger(__name__)


async def create_checkout_session(
    *,
    member_id: UUID,
    stripe_price_id: str,
    stripe_customer_id: str | None,
    success_url: str,
    cancel_url: str,
) -> str | None:
    """Create a Stripe Checkout Session for a recurring membership subscription.

    Returns the session URL or None on failure.

    TODO v0.2: implement with stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": stripe_price_id, "quantity": 1}],
        customer=stripe_customer_id,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"member_id": str(member_id)},
    )
    """
    logger.info(
        "membership.checkout.create",
        member_id=str(member_id),
        stripe_price_id=stripe_price_id,
        has_customer=stripe_customer_id is not None,
    )
    return None


async def cancel_subscription(
    *,
    stripe_subscription_id: str,
    member_id: UUID,
) -> bool:
    """Cancel a Stripe subscription at period end.

    TODO v0.2: stripe.Subscription.modify(stripe_subscription_id, cancel_at_period_end=True)
    """
    logger.info(
        "membership.subscription.cancel",
        stripe_subscription_id=stripe_subscription_id,
        member_id=str(member_id),
    )
    return False


async def send_welcome_email(
    *,
    member_id: UUID,
    email: str,
    display_name: str | None,
    tier_name: str,
) -> None:
    """Send membership welcome email via Resend.

    TODO v0.2: use resend.Emails.send() with a welcome template.
    """
    logger.info(
        "membership.email.welcome",
        member_id=str(member_id),
        email=email,
        tier_name=tier_name,
    )


async def trigger_newsletter_update(
    *,
    post_slug: str,
    post_title: str,
    venue_id: UUID,
) -> None:
    """Trigger cultural update newsletter via Resend broadcast.

    TODO v0.2: use resend.Broadcasts.create() + send() with member audience.
    """
    logger.info(
        "membership.newsletter.trigger",
        post_slug=post_slug,
        post_title=post_title,
        venue_id=str(venue_id),
    )


async def add_newsletter_contact(
    *,
    email: str,
    display_name: str | None,
    venue_id: UUID,
) -> None:
    """Add an email to the Resend audience for cultural updates.

    TODO v0.2: resend.Contacts.create(audience_id=..., email=email, first_name=display_name)
    """
    logger.info(
        "membership.newsletter.contact.add",
        email=email,
        venue_id=str(venue_id),
    )
