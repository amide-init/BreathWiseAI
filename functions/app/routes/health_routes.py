"""Public health-check route handler for operational verification."""

from __future__ import annotations

from typing import Any

from app.config.settings import get_settings
from app.schemas.common import HealthCheckResponse
from app.utils.datetime_utils import to_iso_utc, utc_now


def handle_health(_req: Any) -> HealthCheckResponse:
    """Return service metadata and current UTC timestamp."""
    settings = get_settings()
    return HealthCheckResponse(
        status="ok",
        service=settings.service_name,
        version=settings.api_version,
        environment=settings.environment,
        timestamp=to_iso_utc(utc_now()) or "",
    )
