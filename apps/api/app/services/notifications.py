"""Notification service — SMS via Twilio, email via Resend.

Delivery functions are async (called from Celery tasks via asyncio.run).
Each _deliver_* function:
  1. Loads the reservation + guest from DB
  2. Decrypts PII
  3. Sends via the appropriate provider
  4. Updates the reservation (e.g. reminder_sent_at)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import resend
import structlog
from sqlalchemy import select
from twilio.rest import Client as TwilioClient

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.encryption import decrypt_pii
from app.models.reservation import Reservation, ReservationStatus

logger = structlog.get_logger(__name__)

# ── localised copy ─────────────────────────────────────────────────────────────

_SMS_CONFIRM = {
    "ro": (
        "La Mița Biciclista: Rezervarea #{code} confirmată "
        "pentru {dt}. Anulare: {cancel_url}"
    ),
    "en": (
        "La Mița Biciclista: Booking #{code} confirmed "
        "for {dt}. Cancel: {cancel_url}"
    ),
}

_SMS_REMINDER = {
    "ro": "La Mița Biciclista: Reminder rezervare mâine {dt}. Cod: #{code}",
    "en": "La Mița Biciclista: Reminder, booking tomorrow {dt}. Code: #{code}",
}

_SMS_CANCEL = {
    "ro": "La Mița Biciclista: Rezervarea #{code} a fost anulată.",
    "en": "La Mița Biciclista: Booking #{code} has been cancelled.",
}

_EMAIL_SUBJECT_CONFIRM = {
    "ro": "Rezervarea ta la La Mița Biciclista — #{code}",
    "en": "Your reservation at La Mița Biciclista — #{code}",
}
_EMAIL_SUBJECT_REMINDER = {
    "ro": "Reminder: rezervarea ta mâine la La Mița Biciclista",
    "en": "Reminder: your reservation tomorrow at La Mița Biciclista",
}
_EMAIL_SUBJECT_CANCEL = {
    "ro": "Rezervarea ta la La Mița Biciclista a fost anulată",
    "en": "Your La Mița Biciclista reservation has been cancelled",
}


# ── helpers ────────────────────────────────────────────────────────────────────

def _t(mapping: dict[str, str], lang: str) -> str:
    return mapping.get(lang, mapping["en"])


def _cancel_url(token: str, base_url: str) -> str:
    return f"{base_url}/reserve/cancel?token={token}"


def _modify_url(token: str, base_url: str) -> str:
    return f"{base_url}/reserve/modify?token={token}"


def _fmt_dt(dt: datetime, lang: str) -> str:
    if lang == "ro":
        return dt.strftime("%-d %B, %H:%M")
    return dt.strftime("%B %-d at %H:%M")


def _confirmation_html(reservation: Reservation, guest_name: str, lang: str, base_url: str) -> str:
    code = reservation.confirmation_code or ""
    dt = _fmt_dt(reservation.reserved_at, lang)
    cancel_url = _cancel_url(reservation.cancellation_token or "", base_url)
    modify_url = _modify_url(reservation.cancellation_token or "", base_url)
    if lang == "ro":
        return f"""<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><title>Confirmare Rezervare</title></head>
<body style="font-family:'Inter',sans-serif;background:#FAF6F0;color:#1a1a1a;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <tr><td style="background:#2C4A2E;padding:32px 40px">
    <h1 style="color:#FAF6F0;font-family:'Playfair Display',Georgia,serif;margin:0;font-size:24px">La Mița Biciclista</h1>
    <p style="color:#B8962E;margin:4px 0 0;font-size:13px;letter-spacing:.05em">STABILIMENT CREATIV</p>
  </td></tr>
  <tr><td style="padding:40px">
    <h2 style="font-family:'Playfair Display',Georgia,serif;color:#2C4A2E;margin:0 0 8px">Rezervare confirmată</h2>
    <p style="color:#555;margin:0 0 24px">Bună ziua, {guest_name}!</p>
    <table width="100%" style="border:1px solid #e8e0d6;border-radius:6px;padding:20px;margin-bottom:24px">
      <tr><td style="padding:6px 0;color:#555;font-size:14px">Cod confirmare</td><td style="padding:6px 0;font-weight:600;color:#2C4A2E;text-align:right">#{code}</td></tr>
      <tr><td style="padding:6px 0;color:#555;font-size:14px">Data &amp; ora</td><td style="padding:6px 0;font-weight:600;text-align:right">{dt}</td></tr>
      <tr><td style="padding:6px 0;color:#555;font-size:14px">Persoane</td><td style="padding:6px 0;font-weight:600;text-align:right">{reservation.party_size}</td></tr>
    </table>
    <p style="font-size:13px;color:#888;margin-bottom:24px">Str. Biserica Amzei 9, București · Salon Istoric (Etaj 1)</p>
    <a href="{modify_url}" style="display:inline-block;margin-right:12px;padding:10px 20px;background:#2C4A2E;color:#FAF6F0;text-decoration:none;border-radius:4px;font-size:14px">Modifică rezervarea</a>
    <a href="{cancel_url}" style="display:inline-block;padding:10px 20px;border:1px solid #ccc;color:#555;text-decoration:none;border-radius:4px;font-size:14px">Anulează</a>
  </td></tr>
  <tr><td style="background:#FAF6F0;padding:20px 40px;font-size:12px;color:#aaa;text-align:center">
    © La Mița Biciclista · <a href="https://lamitabiciclista.ro" style="color:#B8962E;text-decoration:none">lamitabiciclista.ro</a>
  </td></tr>
</table>
</body></html>"""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Reservation Confirmation</title></head>
<body style="font-family:'Inter',sans-serif;background:#FAF6F0;color:#1a1a1a;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <tr><td style="background:#2C4A2E;padding:32px 40px">
    <h1 style="color:#FAF6F0;font-family:'Playfair Display',Georgia,serif;margin:0;font-size:24px">La Mița Biciclista</h1>
    <p style="color:#B8962E;margin:4px 0 0;font-size:13px;letter-spacing:.05em">STABILIMENT CREATIV</p>
  </td></tr>
  <tr><td style="padding:40px">
    <h2 style="font-family:'Playfair Display',Georgia,serif;color:#2C4A2E;margin:0 0 8px">Reservation confirmed</h2>
    <p style="color:#555;margin:0 0 24px">Hello, {guest_name}!</p>
    <table width="100%" style="border:1px solid #e8e0d6;border-radius:6px;padding:20px;margin-bottom:24px">
      <tr><td style="padding:6px 0;color:#555;font-size:14px">Confirmation code</td><td style="padding:6px 0;font-weight:600;color:#2C4A2E;text-align:right">#{code}</td></tr>
      <tr><td style="padding:6px 0;color:#555;font-size:14px">Date &amp; time</td><td style="padding:6px 0;font-weight:600;text-align:right">{dt}</td></tr>
      <tr><td style="padding:6px 0;color:#555;font-size:14px">Party size</td><td style="padding:6px 0;font-weight:600;text-align:right">{reservation.party_size}</td></tr>
    </table>
    <p style="font-size:13px;color:#888;margin-bottom:24px">Str. Biserica Amzei 9, Bucharest · Salon Istoric (Floor 1)</p>
    <a href="{modify_url}" style="display:inline-block;margin-right:12px;padding:10px 20px;background:#2C4A2E;color:#FAF6F0;text-decoration:none;border-radius:4px;font-size:14px">Modify reservation</a>
    <a href="{cancel_url}" style="display:inline-block;padding:10px 20px;border:1px solid #ccc;color:#555;text-decoration:none;border-radius:4px;font-size:14px">Cancel</a>
  </td></tr>
  <tr><td style="background:#FAF6F0;padding:20px 40px;font-size:12px;color:#aaa;text-align:center">
    © La Mița Biciclista · <a href="https://lamitabiciclista.ro" style="color:#B8962E;text-decoration:none">lamitabiciclista.ro</a>
  </td></tr>
</table>
</body></html>"""


def _reminder_html(reservation: Reservation, guest_name: str, lang: str, base_url: str) -> str:
    code = reservation.confirmation_code or ""
    dt = _fmt_dt(reservation.reserved_at, lang)
    cancel_url = _cancel_url(reservation.cancellation_token or "", base_url)
    if lang == "ro":
        return f"""<!DOCTYPE html>
<html lang="ro"><head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif;background:#FAF6F0;color:#1a1a1a;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <tr><td style="background:#2C4A2E;padding:32px 40px">
    <h1 style="color:#FAF6F0;font-family:'Playfair Display',Georgia,serif;margin:0;font-size:24px">La Mița Biciclista</h1>
  </td></tr>
  <tr><td style="padding:40px">
    <h2 style="font-family:'Playfair Display',Georgia,serif;color:#2C4A2E;margin:0 0 16px">Reminder: rezervarea ta mâine</h2>
    <p>Bună ziua, {guest_name}! Te așteptăm mâine la <strong>{dt}</strong> (cod #{code}, {reservation.party_size} pers.).</p>
    <p style="font-size:13px;color:#888">Str. Biserica Amzei 9, București · Salon Istoric (Etaj 1)</p>
    <a href="{cancel_url}" style="font-size:13px;color:#888">Anulează rezervarea</a>
  </td></tr>
</table>
</body></html>"""
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif;background:#FAF6F0;color:#1a1a1a;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <tr><td style="background:#2C4A2E;padding:32px 40px">
    <h1 style="color:#FAF6F0;font-family:'Playfair Display',Georgia,serif;margin:0;font-size:24px">La Mița Biciclista</h1>
  </td></tr>
  <tr><td style="padding:40px">
    <h2 style="font-family:'Playfair Display',Georgia,serif;color:#2C4A2E;margin:0 0 16px">Reminder: your reservation tomorrow</h2>
    <p>Hello, {guest_name}! We look forward to seeing you tomorrow at <strong>{dt}</strong> (code #{code}, {reservation.party_size} guests).</p>
    <p style="font-size:13px;color:#888">Str. Biserica Amzei 9, Bucharest · Salon Istoric (Floor 1)</p>
    <a href="{cancel_url}" style="font-size:13px;color:#888">Cancel reservation</a>
  </td></tr>
</table>
</body></html>"""


# ── SMS / email senders ────────────────────────────────────────────────────────

def _send_sms(to: str, body: str) -> None:
    settings = get_settings()
    sid = settings.twilio_account_sid.get_secret_value()
    token = settings.twilio_auth_token.get_secret_value()
    from_number = settings.twilio_from_number

    if not sid or not token or not from_number:
        logger.warning("twilio.not_configured", to=to)
        return

    client = TwilioClient(sid, token)
    message = client.messages.create(body=body, from_=from_number, to=to)
    logger.info("sms.sent", sid=message.sid, to=to, status=message.status)


def _send_email(to: str, subject: str, html: str) -> None:
    settings = get_settings()
    api_key = settings.resend_api_key.get_secret_value()

    if not api_key:
        logger.warning("resend.not_configured", to=to)
        return

    resend.api_key = api_key
    resp = resend.Emails.send(
        {
            "from": settings.resend_from_address,
            "to": [to],
            "subject": subject,
            "html": html,
        }
    )
    logger.info("email.sent", id=resp.get("id"), to=to)


# ── delivery orchestrators (called from Celery tasks) ─────────────────────────

async def _deliver_confirmation(reservation_id: uuid.UUID) -> None:
    settings = get_settings()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Reservation).where(Reservation.id == reservation_id)
        )
        reservation = result.scalar_one_or_none()
        if reservation is None:
            logger.error("notify.reservation_not_found", reservation_id=str(reservation_id))
            return

        guest = reservation.guest
        lang = reservation.language
        code = reservation.confirmation_code or ""
        dt_str = _fmt_dt(reservation.reserved_at, lang)
        cancel_url = _cancel_url(reservation.cancellation_token or "", settings.app_base_url)
        guest_name = f"{guest.first_name or ''} {guest.last_name or ''}".strip() or "Oaspete"

        if guest.enc_phone:
            try:
                phone = decrypt_pii(guest.enc_phone)
                sms_body = _t(_SMS_CONFIRM, lang).format(
                    code=code, dt=dt_str, cancel_url=cancel_url
                )
                _send_sms(phone, sms_body)
            except Exception:
                logger.exception("notify.sms_confirm_failed", reservation_id=str(reservation_id))

        if guest.enc_email:
            try:
                email = decrypt_pii(guest.enc_email)
                subject = _t(_EMAIL_SUBJECT_CONFIRM, lang).replace("#{code}", f"#{code}")
                html = _confirmation_html(reservation, guest_name, lang, settings.app_base_url)
                _send_email(email, subject, html)
            except Exception:
                logger.exception("notify.email_confirm_failed", reservation_id=str(reservation_id))


async def _deliver_reminder(reservation_id: uuid.UUID) -> None:
    settings = get_settings()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Reservation).where(Reservation.id == reservation_id)
        )
        reservation = result.scalar_one_or_none()
        if reservation is None or reservation.status != ReservationStatus.CONFIRMED:
            return
        if reservation.reminder_sent_at is not None:
            return  # idempotency guard

        guest = reservation.guest
        lang = reservation.language
        code = reservation.confirmation_code or ""
        dt_str = _fmt_dt(reservation.reserved_at, lang)
        guest_name = f"{guest.first_name or ''} {guest.last_name or ''}".strip() or "Oaspete"

        if guest.enc_phone:
            try:
                phone = decrypt_pii(guest.enc_phone)
                sms_body = _t(_SMS_REMINDER, lang).format(code=code, dt=dt_str)
                _send_sms(phone, sms_body)
            except Exception:
                logger.exception("notify.sms_reminder_failed", reservation_id=str(reservation_id))

        if guest.enc_email:
            try:
                email = decrypt_pii(guest.enc_email)
                subject = _t(_EMAIL_SUBJECT_REMINDER, lang)
                html = _reminder_html(reservation, guest_name, lang, settings.app_base_url)
                _send_email(email, subject, html)
            except Exception:
                logger.exception("notify.email_reminder_failed", reservation_id=str(reservation_id))

        reservation.reminder_sent_at = datetime.now(tz=timezone.utc)
        await db.commit()


async def _deliver_waitlist_ready(entry_id: uuid.UUID) -> None:
    """Send 'table ready' SMS to a walk-in guest."""
    from app.models.waitlist import WaitlistEntry  # local import avoids circular deps

    _SMS_READY = "La Mița Biciclista: Masa ta este gata! Te rugăm să te prezinți la intrare în maxim 10 minute."

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(WaitlistEntry).where(WaitlistEntry.id == entry_id))
        entry = result.scalar_one_or_none()
        if entry is None:
            logger.error("notify.waitlist_entry_not_found", entry_id=str(entry_id))
            return

        if not entry.enc_guest_phone:
            return

        try:
            phone = decrypt_pii(entry.enc_guest_phone)
            _send_sms(phone, _SMS_READY)
        except Exception:
            logger.exception("notify.sms_waitlist_ready_failed", entry_id=str(entry_id))


async def _deliver_cancellation(reservation_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Reservation).where(Reservation.id == reservation_id)
        )
        reservation = result.scalar_one_or_none()
        if reservation is None:
            return

        guest = reservation.guest
        lang = reservation.language
        code = reservation.confirmation_code or ""
        dt_str = _fmt_dt(reservation.reserved_at, lang)
        guest_name = f"{guest.first_name or ''} {guest.last_name or ''}".strip() or "Oaspete"
        new_res_url = "https://app.lamitabiciclista.ro/reserve"

        if guest.enc_phone:
            try:
                phone = decrypt_pii(guest.enc_phone)
                sms_body = _t(_SMS_CANCEL, lang).format(code=code)
                _send_sms(phone, sms_body)
            except Exception:
                logger.exception("notify.sms_cancel_failed", reservation_id=str(reservation_id))

        if guest.enc_email:
            try:
                email = decrypt_pii(guest.enc_email)
                subject = _t(_EMAIL_SUBJECT_CANCEL, lang)
                if lang == "ro":
                    html = f"""<!DOCTYPE html>
<html lang="ro"><head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif;background:#FAF6F0;color:#1a1a1a;margin:0;padding:32px">
<div style="max-width:560px;margin:auto;background:#fff;border-radius:8px;padding:40px">
<h2 style="color:#2C4A2E;font-family:'Playfair Display',Georgia,serif">Rezervare anulată</h2>
<p>Bună ziua, {guest_name}.</p>
<p>Rezervarea ta #{code} din {dt_str} a fost anulată.</p>
<p><a href="{new_res_url}" style="color:#2C4A2E">Fă o nouă rezervare</a></p>
</div></body></html>"""
                else:
                    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:'Inter',sans-serif;background:#FAF6F0;color:#1a1a1a;margin:0;padding:32px">
<div style="max-width:560px;margin:auto;background:#fff;border-radius:8px;padding:40px">
<h2 style="color:#2C4A2E;font-family:'Playfair Display',Georgia,serif">Reservation cancelled</h2>
<p>Hello, {guest_name}.</p>
<p>Your reservation #{code} on {dt_str} has been cancelled.</p>
<p><a href="{new_res_url}" style="color:#2C4A2E">Make a new reservation</a></p>
</div></body></html>"""
                _send_email(email, subject, html)
            except Exception:
                logger.exception("notify.email_cancel_failed", reservation_id=str(reservation_id))
