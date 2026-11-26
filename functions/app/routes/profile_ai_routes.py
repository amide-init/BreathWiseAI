"""Thin callable route handler for `parse_household_profile` (AI Family Setup)."""

from __future__ import annotations

from typing import Any

from app.schemas.profile_ai import ParsedHouseholdDraft
from app.services.profile_ai_service import ProfileAiService
from app.utils.callable_utils import get_callable_data
from app.utils.errors import ValidationError


def handle_parse_household_profile_callable(req: Any) -> ParsedHouseholdDraft:
    """Validate description text and return a structured household draft for review."""
    data = get_callable_data(req)
    description = str(data.get("description") or "").strip()
    if not description:
        raise ValidationError("Please enter a short description of your family and home.")
    return ProfileAiService().parse_household_description(description=description)
