"""LMBSC Hospitality Platform — FastAPI application entry point."""

import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import sentry_sdk
import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal, engine
from app.routers import analytics, campaigns, community, events, guests, membership, menu, occupancy, reservations, seating, shifts, shop, tables, venues, waitlist
from app.services.unifi_protect import UniFiOccupancyPoller

logger = structlog.get_logger(__name__)
settings = get_settings()

_unifi_poller: UniFiOccupancyPoller | None = None


def _init_sentry() -> None:
    if not settings.sentry_dsn:
        return
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        release=settings.app_version,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=0.2,
        send_default_pii=False,
    )
    logger.info("sentry_initialized", environment=settings.environment)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    global _unifi_poller
    _init_sentry()
    logger.info("startup", version=settings.app_version, env=settings.environment)
    _unifi_poller = UniFiOccupancyPoller(settings, AsyncSessionLocal)
    await _unifi_poller.start()
    yield
    if _unifi_poller:
        await _unifi_poller.stop()
    logger.info("shutdown")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if (settings.debug or settings.show_docs) else None,
    redoc_url="/redoc" if (settings.debug or settings.show_docs) else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):  # type: ignore[no-untyped-def]
    request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id, path=request.url.path, method=request.method)
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": str(exc)})


@app.get("/health", tags=["ops"])
async def health() -> dict:
    checks: dict[str, str] = {}

    # Database check
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception as exc:
        logger.warning("health_db_fail", error=str(exc))
        checks["db"] = "error"

    # Redis check
    try:
        import redis.asyncio as aioredis

        r = aioredis.from_url(str(settings.redis_url), socket_connect_timeout=2)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception as exc:
        logger.warning("health_redis_fail", error=str(exc))
        checks["redis"] = "error"

    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": overall, "version": settings.app_version, "checks": checks}


app.include_router(reservations.router, prefix="/api/v1")
app.include_router(guests.router, prefix="/api/v1")
app.include_router(venues.router, prefix="/api/v1")
app.include_router(tables.router, prefix="/api/v1")
app.include_router(tables.ws_router, prefix="/ws")
app.include_router(waitlist.router, prefix="/api/v1")
app.include_router(waitlist.ws_router, prefix="/ws")
app.include_router(seating.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(shifts.router, prefix="/api/v1")
app.include_router(shop.router, prefix="/api/v1")
app.include_router(menu.router, prefix="/api/v1")
app.include_router(menu.ws_router, prefix="/ws")
app.include_router(occupancy.router, prefix="/api/v1")
app.include_router(membership.router, prefix="/api/v1")
app.include_router(community.router, prefix="/api/v1")
