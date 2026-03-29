"""LMBSC Hospitality Platform — FastAPI application entry point."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.routers import guests, reservations, seating, tables, venues, waitlist

logger = structlog.get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("startup", version=settings.app_version, env=settings.environment)
    yield
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


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": str(exc)})


@app.get("/health", tags=["ops"])
async def health() -> dict:
    return {"status": "ok", "version": settings.app_version}


app.include_router(reservations.router, prefix="/api/v1")
app.include_router(guests.router, prefix="/api/v1")
app.include_router(venues.router, prefix="/api/v1")
app.include_router(tables.router, prefix="/api/v1")
app.include_router(tables.ws_router, prefix="/ws")
app.include_router(waitlist.router, prefix="/api/v1")
app.include_router(waitlist.ws_router, prefix="/ws")
app.include_router(seating.router, prefix="/api/v1")
