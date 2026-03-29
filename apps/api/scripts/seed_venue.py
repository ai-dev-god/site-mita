"""Seed La Mița Biciclista venue, zones, and tables.

Idempotent — safe to run multiple times. Uses deterministic UUIDs derived
from venue/zone slugs so the IDs are stable across environments.

Usage:
    PYTHONPATH=/home/mita/lmbsc/apps/api python scripts/seed_venue.py
"""

import asyncio
import os
import sys
import uuid

# Ensure app package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.table import Table, TableShape, TableStatus
from app.models.venue import Venue
from app.models.zone import ReservationPolicy, Zone, ZoneType

# ── Deterministic UUIDs ───────────────────────────────────────────────────────
_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # RFC 4122 URL namespace

VENUE_ID = uuid.uuid5(_NS, "lamita-biciclista")
ZONE_IDS = {
    "brasserie":     uuid.uuid5(_NS, "lamita-biciclista/brasserie"),
    "salon_istoric": uuid.uuid5(_NS, "lamita-biciclista/salon_istoric"),
    "expozitie":     uuid.uuid5(_NS, "lamita-biciclista/expozitie"),
}


# ── Seed data ─────────────────────────────────────────────────────────────────

VENUE = dict(
    id=VENUE_ID,
    venue_id=VENUE_ID,   # AuditMixin self-reference on the Venue table
    name="La Mița Biciclista",
    slug="lamita-biciclista",
    address="Str. Biserica Amzei 9",
    city="București",
    country_code="RO",
    phone="+40210000000",
    email="rezervari@lamitabiciclista.ro",
    timezone="Europe/Bucharest",
    default_language="ro",
    opens_at=time(12, 0),
    closes_at=time(23, 0),
)

ZONES = [
    dict(
        id=ZONE_IDS["brasserie"],
        venue_id=VENUE_ID,
        name="Brasserie",
        slug="brasserie",
        description="Parter, atmosferă animată, walk-in welcome.",
        zone_type=ZoneType.BRASSERIE,
        reservation_policy=ReservationPolicy.WALK_IN_ONLY,
        total_capacity=60,
        max_party_size=10,
        opens_at=time(12, 0),
        closes_at=time(23, 0),
        is_active=True,
    ),
    dict(
        id=ZONE_IDS["salon_istoric"],
        venue_id=VENUE_ID,
        name="Salon Istoric",
        slug="salon_istoric",
        description="Etaj 1, ambianță rafinată, rezervare obligatorie.",
        zone_type=ZoneType.SALON_ISTORIC,
        reservation_policy=ReservationPolicy.RESERVATION_REQUIRED,
        total_capacity=40,
        max_party_size=12,
        opens_at=time(19, 0),
        closes_at=time(23, 0),
        is_active=True,
    ),
    dict(
        id=ZONE_IDS["expozitie"],
        venue_id=VENUE_ID,
        name="Expoziție",
        slug="expozitie",
        description="Galerie & événement, intrare cu bilet.",
        zone_type=ZoneType.EXPOZITIE,
        reservation_policy=ReservationPolicy.TICKETED,
        total_capacity=30,
        max_party_size=30,
        is_active=True,
    ),
]

# (label, zone_slug, min_covers, max_covers, shape)
TABLE_SPECS = [
    # Brasserie — 6 round tables
    ("B01", "brasserie", 1, 4, TableShape.ROUND),
    ("B02", "brasserie", 1, 4, TableShape.ROUND),
    ("B03", "brasserie", 2, 6, TableShape.RECTANGLE),
    ("B04", "brasserie", 2, 6, TableShape.RECTANGLE),
    ("B05", "brasserie", 1, 2, TableShape.ROUND),
    ("B06", "brasserie", 4, 8, TableShape.RECTANGLE),
    # Salon Istoric — 4 tables
    ("S01", "salon_istoric", 2, 4, TableShape.ROUND),
    ("S02", "salon_istoric", 2, 6, TableShape.RECTANGLE),
    ("S03", "salon_istoric", 4, 8, TableShape.RECTANGLE),
    ("S04", "salon_istoric", 6, 12, TableShape.RECTANGLE),
    # Expoziție — 3 event tables
    ("E01", "expozitie", 10, 20, TableShape.RECTANGLE),
    ("E02", "expozitie", 10, 20, TableShape.RECTANGLE),
    ("E03", "expozitie", 5, 30, TableShape.RECTANGLE),
]


def _table_id(label: str) -> uuid.UUID:
    return uuid.uuid5(_NS, f"lamita-biciclista/table/{label}")


# ── Main ──────────────────────────────────────────────────────────────────────

async def seed() -> None:
    settings = get_settings()
    engine = create_async_engine(str(settings.database_url), echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as session:
        async with session.begin():

            # ── Venue ─────────────────────────────────────────────────────────
            r = await session.execute(select(Venue).where(Venue.id == VENUE_ID))
            if r.scalar_one_or_none() is None:
                session.add(Venue(**VENUE))
                print(f"✓ Venue created: {VENUE['name']}")
            else:
                print(f"  Venue exists:  {VENUE['name']}")

            # ── Zones ─────────────────────────────────────────────────────────
            for zd in ZONES:
                r = await session.execute(select(Zone).where(Zone.id == zd["id"]))
                if r.scalar_one_or_none() is None:
                    session.add(Zone(**zd))
                    print(f"✓ Zone created:  {zd['name']}")
                else:
                    print(f"  Zone exists:   {zd['name']}")

            # ── Tables ────────────────────────────────────────────────────────
            for label, zone_slug, min_cov, max_cov, shape in TABLE_SPECS:
                tid = _table_id(label)
                r = await session.execute(select(Table).where(Table.id == tid))
                if r.scalar_one_or_none() is None:
                    session.add(Table(
                        id=tid,
                        venue_id=VENUE_ID,
                        zone_id=ZONE_IDS[zone_slug],
                        label=label,
                        shape=shape,
                        min_covers=min_cov,
                        max_covers=max_cov,
                        status=TableStatus.AVAILABLE,
                    ))
                    print(f"✓ Table created: {label}")
                else:
                    print(f"  Table exists:  {label}")

    await engine.dispose()
    print()
    print("✓ Seed complete.")
    print()
    print("Venue ID:", VENUE_ID)
    for slug, zid in ZONE_IDS.items():
        print(f"Zone {slug:20s}: {zid}")


if __name__ == "__main__":
    asyncio.run(seed())
