"""Thin callable route handler for `generate_daily_plan` (FR-06)."""

from __future__ import annotations

import re
from typing import Any

from app.services.planner_service import PlannerService
from app.utils.callable_utils import get_callable_data, require_callable_auth
from app.utils.errors import ValidationError

_LOCATION_ID_RE = re.compile(r"^[a-zA-Z0-9._-]{1,128}$")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _parse_coord(raw: Any, name: str, *, low: float, high: float) -> float:
    if raw is None or str(raw).strip() == "":
        raise ValidationError(f"Missing required parameter '{name}'.")
    try:
        val = float(raw)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"Parameter '{name}' must be a valid number.") from exc
    if not (low <= val <= high):
        raise ValidationError(f"Parameter '{name}' must be between {low} and {high}.")
    return val


def handle_generate_daily_plan_callable(req: Any) -> dict[str, Any]:
    """Authenticate callable user, validate inputs, and invoke 5-node LangGraph planner."""
    auth_user = require_callable_auth(req)
    data = get_callable_data(req)

    location_id = str(data.get("locationId") or "").strip()
    if not _LOCATION_ID_RE.match(location_id):
        raise ValidationError("Invalid or missing 'locationId' parameter.")

    lat = _parse_coord(data.get("lat"), "lat", low=-90.0, high=90.0)
    lng = _parse_coord(data.get("lng"), "lng", low=-180.0, high=180.0)
    label = str(data.get("label") or location_id).strip()[:160]

    raw_date = data.get("planDate")
    plan_date: str | None = None
    if raw_date is not None and str(raw_date).strip():
        candidate = str(raw_date).strip()
        if not _DATE_RE.match(candidate):
            raise ValidationError("Parameter 'planDate' must use YYYY-MM-DD format.")
        plan_date = candidate

    raw_family_id = data.get("familyId")
    family_id = (
        str(raw_family_id).strip()
        if isinstance(raw_family_id, str) and raw_family_id.strip()
        else None
    )
    force_refresh = bool(data.get("forceRefresh", False))
    raw_window = data.get("currentTimeWindow")
    current_time_window = (
        str(raw_window).strip().lower()
        if isinstance(raw_window, str)
        and str(raw_window).strip().lower() in {"morning", "afternoon", "evening"}
        else None
    )

    return PlannerService().generate_daily_plan(
        user_id=auth_user.uid,
        location_id=location_id,
        lat=lat,
        lng=lng,
        location_label=label,
        family_id=family_id,
        plan_date=plan_date,
        force_refresh=force_refresh,
        current_time_window=current_time_window,
    )
