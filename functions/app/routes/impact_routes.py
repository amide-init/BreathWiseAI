"""Thin callable route handlers for Sustainability & Impact Tracking (PRD Module 5 / FR-09, FR-10)."""

from __future__ import annotations

import re
from typing import Any

from pydantic import ValidationError as PydanticValidationError

from app.schemas.impact import ImpactLogRequest
from app.services.impact_service import ImpactService
from app.utils.callable_utils import get_callable_data, require_callable_auth
from app.utils.errors import ValidationError

_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{1,128}$")


def handle_log_impact_action_callable(req: Any) -> dict[str, Any]:
    """Authenticate callable user, validate action payload, and compute deterministic impact."""
    auth_user = require_callable_auth(req)
    data = get_callable_data(req)

    try:
        parsed = ImpactLogRequest.model_validate(data)
    except PydanticValidationError as exc:
        raise ValidationError(f"Invalid impact action: {exc.errors()[0]['msg']}") from exc

    return ImpactService().log_action(user_id=auth_user.uid, req=parsed)


def handle_get_impact_summary_callable(req: Any) -> dict[str, Any]:
    """Authenticate callable user and return strictly separated emissions & exposure summary."""
    auth_user = require_callable_auth(req)
    data = get_callable_data(req)

    raw_days = data.get("days", 14)
    try:
        days = int(raw_days)
    except (TypeError, ValueError) as exc:
        raise ValidationError("Parameter 'days' must be an integer.") from exc

    return ImpactService().get_summary(user_id=auth_user.uid, days=days)


def handle_delete_impact_action_callable(req: Any) -> dict[str, Any]:
    """Authenticate callable user and delete a single user-owned impact log."""
    auth_user = require_callable_auth(req)
    data = get_callable_data(req)

    log_id = str(data.get("logId") or "").strip()
    if not _SAFE_ID_RE.match(log_id):
        raise ValidationError("Invalid or missing 'logId' parameter.")

    return ImpactService().delete_action(user_id=auth_user.uid, log_id=log_id)
