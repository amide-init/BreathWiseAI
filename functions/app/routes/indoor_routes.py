"""Thin callable route handler for `assess_indoor_air` (PRD Module 4 / FR-07)."""

from __future__ import annotations

import re
from typing import Any

from pydantic import ValidationError as PydanticValidationError

from app.schemas.planner import IndoorQuestionnaire
from app.services.indoor_service import IndoorAdvisorService
from app.utils.callable_utils import get_callable_data, require_callable_auth
from app.utils.errors import ValidationError

_LOCATION_ID_RE = re.compile(r"^[a-zA-Z0-9._-]{1,128}$")


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


def handle_assess_indoor_air_callable(req: Any) -> dict[str, Any]:
    """Authenticate callable user, validate questionnaire inputs, and run Indoor Advisor."""
    auth_user = require_callable_auth(req)
    data = get_callable_data(req)

    location_id = str(data.get("locationId") or "").strip()
    if not _LOCATION_ID_RE.match(location_id):
        raise ValidationError("Invalid or missing 'locationId' parameter.")

    lat = _parse_coord(data.get("lat"), "lat", low=-90.0, high=90.0)
    lng = _parse_coord(data.get("lng"), "lng", low=-180.0, high=180.0)
    label = str(data.get("label") or location_id).strip()[:160]

    raw_family_id = data.get("familyId")
    family_id = (
        str(raw_family_id).strip()
        if isinstance(raw_family_id, str) and raw_family_id.strip()
        else None
    )

    raw_q = data.get("questionnaire")
    if not isinstance(raw_q, dict):
        raise ValidationError("Missing required 'questionnaire' object.")

    try:
        questionnaire = IndoorQuestionnaire.model_validate(raw_q)
    except PydanticValidationError as exc:
        raise ValidationError(f"Invalid indoor questionnaire: {exc.errors()[0]['msg']}") from exc

    return IndoorAdvisorService().assess_indoor_air(
        user_id=auth_user.uid,
        location_id=location_id,
        lat=lat,
        lng=lng,
        location_label=label,
        questionnaire=questionnaire,
        family_id=family_id,
    )
