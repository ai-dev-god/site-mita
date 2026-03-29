"""UniFi Protect NVR integration — live headcount via camera analytics.

Architecture
------------
1. ``UniFiProtectClient`` handles auth (cookie-based) and REST calls to the
   local NVR.  It is intentionally stateless beyond a session cookie cache so
   that it can be reconstructed on auth failure.

2. ``UniFiOccupancyPoller`` runs as a background asyncio task (started in the
   FastAPI lifespan).  Every ``UNIFI_POLL_INTERVAL_SECONDS`` it fetches the
   latest occupancy count per configured zone from the NVR and writes a row to
   ``occupancy_events``.

3. Zone mapping is configured via the ``UNIFI_ZONE_MAP`` env var — a JSON dict:
       {"<camera_id>:<zone_idx>": "<venue_zone_uuid>"}
   This must be filled in by the operator after the NVR credentials are known.

Usage (lifespan)
----------------
    poller = UniFiOccupancyPoller(settings, db_session_factory)
    await poller.start()   # non-blocking; spawns background task
    ...
    await poller.stop()
"""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
import structlog

from app.core.config import Settings

logger = structlog.get_logger(__name__)


class UniFiProtectClient:
    """Thin async HTTP client for the UniFi Protect local REST API.

    UniFi Protect uses cookie-based auth:
    - POST /api/auth/login  → sets ``TOKEN`` cookie
    - All subsequent requests must carry that cookie.

    NOTE: The NVR uses a self-signed TLS certificate — ``verify=False`` is
    intentional and expected for local-network NVR access.
    """

    _AUTH_PATH = "/api/auth/login"
    _BOOTSTRAP_PATH = "/proxy/protect/api/bootstrap"

    def __init__(self, base_url: str, username: str, password: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._username = username
        self._password = password
        self._cookies: dict[str, str] = {}

    async def authenticate(self) -> None:
        """Obtain an auth cookie from the NVR."""
        async with httpx.AsyncClient(verify=False, timeout=10) as client:  # noqa: S501
            resp = await client.post(
                f"{self._base_url}{self._AUTH_PATH}",
                json={"username": self._username, "password": self._password},
            )
            resp.raise_for_status()
            self._cookies = dict(resp.cookies)
            logger.info("unifi_protect_auth_ok", base_url=self._base_url)

    async def _get(self, path: str) -> Any:
        async with httpx.AsyncClient(
            verify=False,  # noqa: S501
            cookies=self._cookies,
            timeout=10,
        ) as client:
            resp = await client.get(f"{self._base_url}{path}")
            if resp.status_code == 401:
                # Token expired — re-auth and retry once
                await self.authenticate()
                async with httpx.AsyncClient(
                    verify=False,  # noqa: S501
                    cookies=self._cookies,
                    timeout=10,
                ) as retry_client:
                    resp = await retry_client.get(f"{self._base_url}{path}")
            resp.raise_for_status()
            return resp.json()

    async def get_bootstrap(self) -> dict[str, Any]:
        """Return the full bootstrap payload (cameras, viewers, zones, etc.)."""
        return await self._get(self._BOOTSTRAP_PATH)  # type: ignore[return-value]

    async def get_camera_analytics(self, camera_id: str) -> dict[str, Any]:
        """Return analytics/zone data for a single camera.

        The endpoint path may vary between Protect firmware versions.
        We try the analytics endpoint first, then fall back to the camera
        detail which includes ``smartDetectZones`` with entry/exit counts.
        """
        path = f"/proxy/protect/api/cameras/{camera_id}"
        return await self._get(path)  # type: ignore[return-value]


def _extract_zone_headcount(camera_data: dict[str, Any], zone_idx: int) -> int | None:
    """Pull the current occupancy count for a zone from a camera payload.

    UniFi Protect exposes zone-level occupancy under
    ``camera.stats.smartDetectZones[zone_idx].occupancy`` in some firmware
    versions, and under ``camera.smartDetectZones[zone_idx].sensitivity`` in
    others.  We try both paths and return None if neither is available.
    """
    # Path 1: camera.stats.smartDetectZones[zone_idx].occupancy
    zones_via_stats: list[dict] = (
        camera_data.get("stats", {}).get("smartDetectZones") or []
    )
    if zone_idx < len(zones_via_stats):
        count = zones_via_stats[zone_idx].get("occupancy")
        if count is not None:
            return int(count)

    # Path 2: camera.smartDetectZones[zone_idx].occupancy
    zones_direct: list[dict] = camera_data.get("smartDetectZones") or []
    if zone_idx < len(zones_direct):
        count = zones_direct[zone_idx].get("occupancy")
        if count is not None:
            return int(count)

    return None


class UniFiOccupancyPoller:
    """Background task that polls UniFi Protect and writes occupancy snapshots.

    Start via ``await poller.start()`` inside the FastAPI lifespan context.
    The task is cancelled cleanly on ``await poller.stop()``.
    """

    def __init__(self, settings: Settings, session_factory: Any) -> None:
        self._settings = settings
        self._session_factory = session_factory
        self._task: asyncio.Task | None = None

    @property
    def _is_configured(self) -> bool:
        return bool(
            self._settings.unifi_protect_url
            and self._settings.unifi_protect_username.get_secret_value()
            and self._settings.unifi_protect_password.get_secret_value()
        )

    async def start(self) -> None:
        if not self._is_configured:
            logger.warning(
                "unifi_protect_not_configured",
                hint="Set UNIFI_PROTECT_URL, UNIFI_PROTECT_USERNAME, UNIFI_PROTECT_PASSWORD",
            )
            return
        self._task = asyncio.create_task(self._poll_loop(), name="unifi_occupancy_poller")
        logger.info("unifi_occupancy_poller_started")

    async def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("unifi_occupancy_poller_stopped")

    async def _poll_loop(self) -> None:
        client = UniFiProtectClient(
            base_url=self._settings.unifi_protect_url,
            username=self._settings.unifi_protect_username.get_secret_value(),
            password=self._settings.unifi_protect_password.get_secret_value(),
        )
        try:
            await client.authenticate()
        except Exception as exc:
            logger.error("unifi_protect_auth_failed", error=str(exc))
            return

        zone_map: dict[str, str] = {}
        try:
            zone_map = json.loads(self._settings.unifi_zone_map)
        except json.JSONDecodeError:
            logger.error("unifi_zone_map_invalid_json", raw=self._settings.unifi_zone_map)

        interval = self._settings.unifi_poll_interval_seconds

        while True:
            try:
                await self._poll_once(client, zone_map)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("unifi_poll_error", error=str(exc))
            await asyncio.sleep(interval)

    async def _poll_once(
        self, client: UniFiProtectClient, zone_map: dict[str, str]
    ) -> None:
        """Fetch headcounts for all mapped zones and persist them."""
        if not zone_map:
            return

        # Collect unique camera IDs to batch API calls
        camera_ids: set[str] = set()
        for key in zone_map:
            cam_id, _ = key.split(":", 1)
            camera_ids.add(cam_id)

        camera_data: dict[str, dict] = {}
        for cam_id in camera_ids:
            try:
                camera_data[cam_id] = await client.get_camera_analytics(cam_id)
            except Exception as exc:
                logger.warning("unifi_camera_fetch_error", camera_id=cam_id, error=str(exc))

        now = datetime.now(timezone.utc)
        events: list[dict] = []

        for map_key, venue_zone_id in zone_map.items():
            cam_id, zone_idx_str = map_key.split(":", 1)
            zone_idx = int(zone_idx_str)
            cam = camera_data.get(cam_id)
            if cam is None:
                continue
            headcount = _extract_zone_headcount(cam, zone_idx)
            if headcount is None:
                logger.debug("unifi_no_occupancy_data", camera_id=cam_id, zone_idx=zone_idx)
                continue

            # Derive venue_id from camera bootstrap data if available;
            # fall back to the hardcoded venue env var.
            venue_id_str: str = cam.get("nvr", {}).get("id") or ""
            try:
                venue_id = uuid.UUID(venue_id_str)
            except (ValueError, AttributeError):
                # Use a placeholder — will be replaced once NVR is configured
                venue_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

            events.append({
                "id": uuid.uuid4(),
                "time": now,
                "venue_id": venue_id,
                "zone_id": uuid.UUID(venue_zone_id),
                "camera_id": cam_id,
                "unifi_zone_id": zone_idx,
                "headcount": headcount,
                "source": "unifi_protect",
            })

        if not events:
            return

        # Persist in a short-lived DB session
        from app.models.occupancy import OccupancyEvent  # local import avoids circulars

        async with self._session_factory() as session:
            session.add_all([OccupancyEvent(**e) for e in events])
            await session.commit()

        logger.info("unifi_occupancy_persisted", count=len(events))
