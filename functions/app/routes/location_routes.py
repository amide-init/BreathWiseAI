"""Thin HTTP route handler for GET /api/v1/locations/search (FR-02)."""

from __future__ import annotations

from typing import Any

from app.services.location_service import LocationService
from app.utils.auth import verify_request_user


def handle_location_search(req: Any) -> dict[str, Any]:
    """Authenticate request and return normalized matching city locations."""
    verify_request_user(req)
    query = req.args.get("q") if hasattr(req, "args") and req.args else None
    results = LocationService().search(query)
    return {"results": [item.model_dump(by_alias=True) for item in results]}
