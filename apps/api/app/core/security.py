"""Clerk JWT verification and role-based access helpers."""

from __future__ import annotations

import time
import uuid
from functools import lru_cache
from typing import Any

import httpx
import structlog
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db

logger = structlog.get_logger(__name__)

bearer_scheme = HTTPBearer(auto_error=True)

# Clerk JWKS endpoint — derived from publishable key domain
_CLERK_JWKS_URL_TEMPLATE = "https://{domain}/.well-known/jwks.json"

# Valid staff roles; guests have no role claim
VALID_ROLES = {"admin", "manager", "host", "server"}


@lru_cache(maxsize=1)
def _jwks_cache_key() -> str:
    """Returns a cache key that forces a refresh every 5 minutes."""
    return str(int(time.time()) // 300)


def _get_clerk_domain() -> str:
    settings = get_settings()
    key = settings.clerk_publishable_key.get_secret_value()
    # Publishable key format: pk_test_<base64> or pk_live_<base64>
    # The domain is embedded in the key after stripping the prefix and decoding.
    # Clerk's own SDK resolves it differently; simplest approach is to use
    # the explicit CLERK_FRONTEND_API env var when set, else derive from JWT issuer.
    domain = settings.clerk_frontend_api
    if not domain:
        raise RuntimeError(
            "CLERK_FRONTEND_API must be set (e.g. 'clerk.lamitabiciclista.ro')"
        )
    return domain


async def _fetch_jwks() -> dict[str, Any]:
    domain = _get_clerk_domain()
    url = _CLERK_JWKS_URL_TEMPLATE.format(domain=domain)
    async with httpx.AsyncClient(timeout=5) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()  # type: ignore[no-any-return]


async def _get_public_key(kid: str) -> Any:
    jwks = await _fetch_jwks()
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            return jwk.construct(key_data)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unable to find matching public key",
    )


async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Verify a Clerk-issued JWT. Returns the decoded claims dict."""
    token = credentials.credentials
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header",
        ) from exc

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing kid",
        )

    public_key = await _get_public_key(kid)
    settings = get_settings()

    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        logger.warning("jwt_verification_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed",
        ) from exc

    return payload


def require_role(*roles: str):
    """Dependency factory: require the authenticated user to have one of the given roles.

    Roles are stored in Clerk's publicMetadata as ``{ "role": "admin" }``,
    which Clerk copies into the JWT under the ``metadata`` claim.
    """
    allowed = set(roles)

    async def _checker(
        claims: dict[str, Any] = Depends(verify_clerk_token),
    ) -> dict[str, Any]:
        user_role: str = (
            claims.get("metadata", {}).get("role")
            or claims.get("public_metadata", {}).get("role")
            or ""
        )
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' is not authorized for this endpoint",
            )
        return claims

    return _checker


# Pre-built dependency shorthands
require_staff = require_role("admin", "manager", "host", "server")
require_manager = require_role("admin", "manager")
require_admin = require_role("admin")


# ── Member-only content gating ────────────────────────────────────────────────

# Tier rank for comparison (higher = more privileges)
_TIER_RANK: dict[str, int] = {"free": 0, "friend": 1, "patron": 2}


async def require_active_member(
    claims: dict[str, Any] = Depends(verify_clerk_token),
    venue_id: uuid.UUID = Query(..., description="Venue the membership belongs to"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Dependency: require an active member record for the given venue.

    Returns the ``Member`` ORM object so downstream handlers can access
    tier/benefits without an additional query.
    """
    from app.models.membership import Member, MemberStatus
    from sqlalchemy.orm import selectinload

    user_id: str = claims.get("sub", "")
    result = await db.execute(
        select(Member)
        .options(selectinload(Member.membership_tier))
        .where(
            and_(
                Member.user_id == user_id,
                Member.venue_id == venue_id,
                Member.status == MemberStatus.ACTIVE,
                Member.deleted_at.is_(None),
            )
        )
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active membership required to access this resource.",
        )
    return member


def require_member_tier(min_tier: str):
    """Dependency factory: require the authenticated user to hold at least ``min_tier``.

    Usage::

        @router.get("/members-only")
        async def endpoint(member = Depends(require_member_tier("friend"))):
            ...
    """
    min_rank = _TIER_RANK.get(min_tier, 0)

    async def _checker(member: Any = Depends(require_active_member)) -> Any:
        tier_value: str = (
            member.membership_tier.tier.value if member.membership_tier else "free"
        )
        if _TIER_RANK.get(tier_value, 0) < min_rank:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Membership tier '{min_tier}' or above required.",
            )
        return member

    return _checker
