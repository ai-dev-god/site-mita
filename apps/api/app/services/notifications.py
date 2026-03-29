"""Notification service — email (SES/SMTP) and SMS (Twilio) confirmations.

v0.1: structured stubs that log intent; wire up real providers in v0.2.
"""

import structlog

from app.models.reservation import Reservation

logger = structlog.get_logger(__name__)

# ── Localised copy ────────────────────────────────────────────────────────────

_SUBJECT: dict[str, str] = {
    "ro": "Rezervarea ta la La Mita Biciclista — confirmare #{code}",
    "en": "Your reservation at La Mita Biciclista — confirmation #{code}",
}

_CANCEL_SUBJECT: dict[str, str] = {
    "ro": "Rezervarea ta la La Mita Biciclista a fost anulată",
    "en": "Your reservation at La Mita Biciclista has been cancelled",
}

_REMINDER_SUBJECT: dict[str, str] = {
    "ro": "Reminder: rezervarea ta mâine la La Mita Biciclista",
    "en": "Reminder: your reservation tomorrow at La Mita Biciclista",
}


def _subject(mapping: dict[str, str], lang: str, **kwargs: str) -> str:
    tpl = mapping.get(lang, mapping["en"])
    return tpl.format(**kwargs)


# ── Email ─────────────────────────────────────────────────────────────────────

async def send_confirmation_email(reservation: Reservation, email: str) -> None:
    """Send booking confirmation email via SES/SMTP.

    TODO v0.2: replace with real boto3 SES or SMTP call.
    """
    subject = _subject(_SUBJECT, reservation.language, code=reservation.confirmation_code or "")
    logger.info(
        "email.confirmation",
        to=email,
        subject=subject,
        reservation_id=str(reservation.id),
        confirmation_code=reservation.confirmation_code,
    )


async def send_cancellation_email(reservation: Reservation, email: str) -> None:
    """Send cancellation confirmation email."""
    subject = _subject(_CANCEL_SUBJECT, reservation.language)
    logger.info(
        "email.cancellation",
        to=email,
        subject=subject,
        reservation_id=str(reservation.id),
    )


async def send_reminder_email(reservation: Reservation, email: str) -> None:
    """Send 24h reminder email."""
    subject = _subject(_REMINDER_SUBJECT, reservation.language)
    logger.info(
        "email.reminder",
        to=email,
        subject=subject,
        reservation_id=str(reservation.id),
    )


# ── SMS ───────────────────────────────────────────────────────────────────────

_SMS_CONFIRM: dict[str, str] = {
    "ro": "La Mita Biciclista: Rezervarea #{code} confirmată pentru {dt}. Anulare: {cancel_url}",
    "en": "La Mita Biciclista: Booking #{code} confirmed for {dt}. Cancel: {cancel_url}",
}

_SMS_REMINDER: dict[str, str] = {
    "ro": "La Mita Biciclista: Reminder rezervare mâine {dt}. Cod: #{code}",
    "en": "La Mita Biciclista: Reminder, booking tomorrow {dt}. Code: #{code}",
}


def _cancel_url(token: str) -> str:
    return f"https://lamitabiciclista.ro/cancel/{token}"


async def send_confirmation_sms(reservation: Reservation, phone: str) -> None:
    """Send booking confirmation via Twilio.

    TODO v0.2: replace with real Twilio client call.
    """
    tpl = _SMS_CONFIRM.get(reservation.language, _SMS_CONFIRM["en"])
    body = tpl.format(
        code=reservation.confirmation_code or "",
        dt=reservation.reserved_at.strftime("%d/%m %H:%M"),
        cancel_url=_cancel_url(reservation.cancellation_token or ""),
    )
    logger.info(
        "sms.confirmation",
        to=phone,
        body=body,
        reservation_id=str(reservation.id),
    )


async def send_reminder_sms(reservation: Reservation, phone: str) -> None:
    """Send 24h reminder SMS."""
    tpl = _SMS_REMINDER.get(reservation.language, _SMS_REMINDER["en"])
    body = tpl.format(
        code=reservation.confirmation_code or "",
        dt=reservation.reserved_at.strftime("%d/%m %H:%M"),
    )
    logger.info(
        "sms.reminder",
        to=phone,
        body=body,
        reservation_id=str(reservation.id),
    )
