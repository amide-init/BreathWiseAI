"""Location search & geocoding provider (Google Maps -> Open-Meteo Geocoding -> Curated fallback)."""

from __future__ import annotations

import re
from typing import Any

import httpx

from app.config.constants import CURATED_INDIAN_CITIES
from app.config.secrets import GOOGLE_MAPS_SERVER_KEY_ENV, get_optional_secret
from app.schemas.environment import LocationResult
from app.utils.http_client import create_http_client

_GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
_OPEN_METEO_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"


def build_location_id(country_code: str, city: str, lat: float, lng: float) -> str:
    """Create a Firestore-safe locationId matching `^[a-zA-Z0-9._-]{1,128}$`."""
    cc = re.sub(r"[^a-z0-9]", "", (country_code or "in").lower())[:4] or "in"
    slug = re.sub(r"[^a-z0-9]+", "-", city.lower()).strip("-")[:48] or "city"
    return f"{cc}-{slug}-{lat:.2f}-{lng:.2f}"


class CompositeLocationProvider:
    """Resilient city search: Google Maps (if keyed) -> Open-Meteo Geocoding -> Curated list."""

    provider_name = "CompositeLocation"

    def __init__(
        self,
        *,
        google_maps_key: str | None = None,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._google_maps_key = google_maps_key
        self._http_client = http_client

    def search_locations(self, query: str) -> list[LocationResult]:
        cleaned = query.strip()
        if len(cleaned) < 2:
            return self.get_curated_cities()

        # 1. Try Google Maps Geocoding when server key is configured
        maps_key = self._google_maps_key or get_optional_secret(GOOGLE_MAPS_SERVER_KEY_ENV)
        if maps_key:
            google_results = self._search_google_maps(cleaned, maps_key)
            if google_results:
                return google_results

        # 2. Try zero-key Open-Meteo Geocoding API
        open_meteo_results = self._search_open_meteo(cleaned)
        if open_meteo_results:
            return open_meteo_results

        # 3. Always-available curated Indian cities fallback
        return self._filter_curated(cleaned)

    @staticmethod
    def get_curated_cities() -> list[LocationResult]:
        return [LocationResult.model_validate(item) for item in CURATED_INDIAN_CITIES]

    def _filter_curated(self, query: str) -> list[LocationResult]:
        q = query.lower()
        return [
            city
            for city in self.get_curated_cities()
            if q in city.city.lower() or q in city.state.lower() or q in city.label.lower()
        ]

    def _search_google_maps(self, query: str, api_key: str) -> list[LocationResult]:
        client = self._http_client or create_http_client()
        close_after = self._http_client is None
        try:
            resp = client.get(_GOOGLE_GEOCODE_URL, params={"address": query, "key": api_key})
            resp.raise_for_status()
            payload = resp.json()
        except Exception:  # noqa: BLE001
            return []
        finally:
            if close_after:
                client.close()

        if not isinstance(payload, dict) or payload.get("status") != "OK":
            return []

        results: list[LocationResult] = []
        for item in (payload.get("results") or [])[:6]:
            loc = ((item.get("geometry") or {}).get("location")) or {}
            lat, lng = loc.get("lat"), loc.get("lng")
            if lat is None or lng is None:
                continue
            components = item.get("address_components") or []
            city = _extract_google_component(components, "locality") or _extract_google_component(
                components, "administrative_area_level_2"
            )
            state = _extract_google_component(components, "administrative_area_level_1") or ""
            country = _extract_google_component(components, "country") or "India"
            country_code = _extract_google_component(components, "country", short=True) or "IN"
            label = str(item.get("formatted_address") or f"{city}, {country}")
            city_name = city or label.split(",")[0].strip()

            results.append(
                LocationResult(
                    location_id=build_location_id(country_code, city_name, float(lat), float(lng)),
                    city=city_name,
                    state=state,
                    country=country,
                    label=label,
                    lat=round(float(lat), 4),
                    lng=round(float(lng), 4),
                )
            )
        return results

    def _search_open_meteo(self, query: str) -> list[LocationResult]:
        client = self._http_client or create_http_client()
        close_after = self._http_client is None
        try:
            resp = client.get(
                _OPEN_METEO_GEOCODE_URL,
                params={"name": query, "count": 6, "language": "en", "format": "json"},
            )
            resp.raise_for_status()
            payload = resp.json()
        except Exception:  # noqa: BLE001
            return []
        finally:
            if close_after:
                client.close()

        raw_items = payload.get("results") if isinstance(payload, dict) else None
        if not isinstance(raw_items, list):
            return []

        results: list[LocationResult] = []
        for item in raw_items[:6]:
            lat = item.get("latitude")
            lng = item.get("longitude")
            name = item.get("name")
            if lat is None or lng is None or not isinstance(name, str):
                continue
            state = str(item.get("admin1") or "")
            country = str(item.get("country") or "")
            country_code = str(item.get("country_code") or "in")
            parts = [p for p in (name, state, country) if p]
            results.append(
                LocationResult(
                    location_id=build_location_id(country_code, name, float(lat), float(lng)),
                    city=name,
                    state=state,
                    country=country,
                    label=", ".join(parts),
                    lat=round(float(lat), 4),
                    lng=round(float(lng), 4),
                )
            )
        return results


def _extract_google_component(
    components: list[dict[str, Any]],
    comp_type: str,
    *,
    short: bool = False,
) -> str | None:
    for comp in components:
        types = comp.get("types") or []
        if comp_type in types:
            key = "short_name" if short else "long_name"
            val = comp.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
    return None
