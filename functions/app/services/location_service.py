"""Location search use-case service."""

from __future__ import annotations

from app.providers.base import LocationProvider
from app.providers.maps_provider import CompositeLocationProvider
from app.schemas.environment import LocationResult
from app.utils.errors import ValidationError


class LocationService:
    """Handles city/locality search with input validation and resilient fallback."""

    def __init__(self, provider: LocationProvider | None = None) -> None:
        self._provider = provider or CompositeLocationProvider()

    def search(self, query: str | None) -> list[LocationResult]:
        if query is None or not query.strip():
            return CompositeLocationProvider.get_curated_cities()

        cleaned = query.strip()
        if len(cleaned) > 80:
            raise ValidationError("Search query must be 80 characters or fewer.")
        if len(cleaned) < 2:
            raise ValidationError("Search query must be at least 2 characters.")

        return self._provider.search_locations(cleaned)
