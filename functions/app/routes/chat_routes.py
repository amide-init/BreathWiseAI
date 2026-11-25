"""Thin callable route handler for `send_chat_message` (PRD Module 6 / FR-08)."""

from __future__ import annotations

import re
from typing import Any

from app.services.chat_service import ChatService
from app.utils.callable_utils import get_callable_data, require_callable_auth
from app.utils.errors import ValidationError

_LOCATION_ID_RE = re.compile(r"^[a-zA-Z0-9._-]{1,128}$")
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{1,128}$")


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


def handle_send_chat_message_callable(req: Any) -> dict[str, Any]:
    """Authenticate callable user, validate chat turn, and run 5-node LangGraph assistant."""
    auth_user = require_callable_auth(req)
    data = get_callable_data(req)

    location_id = str(data.get("locationId") or "").strip()
    if not _LOCATION_ID_RE.match(location_id):
        raise ValidationError("Invalid or missing 'locationId' parameter.")

    lat = _parse_coord(data.get("lat"), "lat", low=-90.0, high=90.0)
    lng = _parse_coord(data.get("lng"), "lng", low=-180.0, high=180.0)
    label = str(data.get("label") or location_id).strip()[:160]

    message = str(data.get("message") or "").strip()
    if not message:
        raise ValidationError("Message cannot be empty.")
    if len(message) > 1000:
        raise ValidationError("Message must be 1000 characters or fewer.")

    raw_session_id = data.get("sessionId")
    session_id: str | None = None
    if isinstance(raw_session_id, str) and raw_session_id.strip():
        candidate = raw_session_id.strip()
        if not _SAFE_ID_RE.match(candidate):
            raise ValidationError("Invalid 'sessionId' parameter.")
        session_id = candidate

    raw_family_id = data.get("familyId")
    family_id = (
        str(raw_family_id).strip()
        if isinstance(raw_family_id, str) and raw_family_id.strip()
        else None
    )

    return ChatService().send_message(
        user_id=auth_user.uid,
        location_id=location_id,
        lat=lat,
        lng=lng,
        location_label=label,
        message=message,
        session_id=session_id,
        family_id=family_id,
    )
