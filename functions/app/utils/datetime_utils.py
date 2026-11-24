"""UTC timestamp, cache TTL, and environmental data freshness helpers."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta


def utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(UTC)


def to_iso_utc(dt: datetime | None) -> str | None:
    """Format a datetime as ISO-8601 UTC string with trailing 'Z'."""
    if dt is None:
        return None
    aware = dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)
    return aware.strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso_utc(value: str | None) -> datetime | None:
    """Parse an ISO-8601 string into timezone-aware UTC datetime."""
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)


def is_cache_valid(
    fetched_at: datetime | None, ttl_minutes: int, *, now: datetime | None = None
) -> bool:
    """Return True if cached observation is within its TTL window."""
    if fetched_at is None:
        return False
    reference = now or utc_now()
    aware = (
        fetched_at.replace(tzinfo=UTC) if fetched_at.tzinfo is None else fetched_at.astimezone(UTC)
    )
    return (reference - aware) <= timedelta(minutes=ttl_minutes)


def classify_freshness(
    observed_at: datetime | None,
    *,
    max_fresh_minutes: int = 60,
    now: datetime | None = None,
) -> str:
    """Classify environmental reading freshness ('fresh' | 'stale' | 'unavailable')."""
    if observed_at is None:
        return "unavailable"
    reference = now or utc_now()
    aware = (
        observed_at.replace(tzinfo=UTC)
        if observed_at.tzinfo is None
        else observed_at.astimezone(UTC)
    )
    age = reference - aware
    if age <= timedelta(minutes=max_fresh_minutes):
        return "fresh"
    return "stale"
