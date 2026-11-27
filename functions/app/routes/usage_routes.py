"""Thin callable route handler for `get_user_usage` (Settings Usage Dashboard)."""

from __future__ import annotations

from typing import Any

from app.schemas.usage import UserUsageSummary
from app.services.usage_service import UsageService
from app.utils.callable_utils import require_callable_auth


def handle_get_user_usage_callable(req: Any) -> UserUsageSummary:
    """Return today's per-user daily quota usage summary for the signed-in user."""
    user = require_callable_auth(req)
    return UsageService().get_usage_summary(user_id=user.uid)
