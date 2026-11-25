"""Thin callable route handler for `get_air_quality` (FR-03 & FR-04)."""

from __future__ import annotations

import re
from typing import Any

from app.schemas.environment import AirQualityResponse
from app.services.air_quality_service import AirQualityService
from app.utils.callable_utils import get_callable_data
from app.utils.errors import ValidationError

_LOCATION_ID_RE = re.compile(r"^[a-zA-Z0-9._-]{1,128}$")


def _parse_float_param(raw: Any, name: str, *, low: float, high: float) -> float:
    if raw is None or str(raw).strip() == "":
        raise ValidationError(f"Missing required parameter '{name}'.")
    try:
        value = float(raw)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"Parameter '{name}' must be a valid number.") from exc
    if not (low <= value <= high):
        raise ValidationError(f"Parameter '{name}' must be between {low} and {high}.")
    return value


def handle_get_air_quality_callable(req: Any) -> AirQualityResponse:
    """Validate callable coordinates and return cache-first air quality."""
    data = get_callable_data(req)

    location_id = str(data.get("locationId") or "").strip()
    if not _LOCATION_ID_RE.match(location_id):
        raise ValidationError("Invalid or missing 'locationId' parameter.")

    lat = _parse_float_param(data.get("lat"), "lat", low=-90.0, high=90.0)
    lng = _parse_float_param(data.get("lng"), "lng", low=-180.0, high=180.0)
    label = str(data.get("label") or location_id).strip()[:120]
    # Only authenticated users can bypass the 30-min server cache to protect upstream quota
    is_authenticated = getattr(req, "auth", None) is not None
    force_refresh = bool(data.get("forceRefresh", False)) and is_authenticated

    return AirQualityService().get_air_quality(
        location_id=location_id,
        lat=lat,
        lng=lng,
        location_label=label,
        force_refresh=force_refresh,
    )
