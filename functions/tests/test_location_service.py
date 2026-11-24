"""Unit tests for location search service and locationId normalization."""

from __future__ import annotations

import re

import pytest

from app.providers.maps_provider import CompositeLocationProvider, build_location_id
from app.schemas.environment import LocationResult
from app.services.location_service import LocationService
from app.utils.errors import ValidationError


class StubLocationProvider:
    provider_name = "StubLocation"

    def search_locations(self, query: str) -> list[LocationResult]:
        return [
            city
            for city in CompositeLocationProvider.get_curated_cities()
            if query.lower() in city.city.lower()
        ]


def test_location_id_matches_firestore_rule_regex() -> None:
    loc_id = build_location_id("IN", "New Delhi", 28.6139, 77.2090)
    assert re.match(r"^[a-zA-Z0-9._-]{1,128}$", loc_id)
    assert loc_id == "in-new-delhi-28.61-77.21"


def test_empty_query_returns_curated_indian_cities() -> None:
    results = LocationService(provider=StubLocationProvider()).search(None)
    assert len(results) >= 6
    assert any(c.city == "New Delhi" for c in results)


def test_search_filters_and_validates_query_length() -> None:
    service = LocationService(provider=StubLocationProvider())
    matches = service.search("delhi")
    assert len(matches) == 1
    assert matches[0].city == "New Delhi"

    with pytest.raises(ValidationError):
        service.search("a")
