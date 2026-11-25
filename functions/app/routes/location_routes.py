"""Thin callable route handler for `search_locations` (FR-02)."""

from __future__ import annotations

from typing import Any

from app.services.location_service import LocationService
from app.utils.callable_utils import get_callable_data


def handle_location_search_callable(req: Any) -> dict[str, Any]:
    """Validate callable input and return normalized matching city locations."""
    data = get_callable_data(req)
    raw_query = data.get("q") or data.get("query")
    query = str(raw_query) if raw_query is not None else None
    results = LocationService().search(query)
    return {"results": [item.model_dump(by_alias=True) for item in results]}
