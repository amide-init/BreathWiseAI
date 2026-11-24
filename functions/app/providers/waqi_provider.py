"""Primary AQI provider adapter for WAQI / India CPCB monitoring stations.

Uses bounded httpx calls, extracts real station PM2.5 / PM10 / observation time,
and never fabricates missing measurements.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.config.secrets import WAQI_API_TOKEN_ENV, get_optional_secret
from app.domain.aqi_calculator import (
    classify_cpcb_naqi,
    derive_naqi_from_pollutants,
    get_default_health_guidance,
)
from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import CurrentAirQuality, PollutantReading
from app.utils.datetime_utils import classify_freshness, parse_iso_utc, to_iso_utc
from app.utils.errors import UpstreamProviderError
from app.utils.http_client import create_http_client

_WAQI_GEO_URL = "https://api.waqi.info/feed/geo:{lat};{lng}/"


def _to_optional_float(raw: Any) -> float | None:
    if raw is None or isinstance(raw, bool):
        return None
    try:
        val = float(raw)
        return val if val >= 0 else None
    except (TypeError, ValueError):
        return None


class WaqiAirQualityProvider:
    """WAQI / CPCB real-time station provider implementing AirQualityProvider protocol."""

    provider_name = "WAQI / CPCB"

    def __init__(
        self,
        *,
        api_token: str | None = None,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._api_token = api_token
        self._http_client = http_client

    def _resolve_token(self) -> str:
        token = self._api_token or get_optional_secret(WAQI_API_TOKEN_ENV)
        if not token:
            raise UpstreamProviderError(self.provider_name, "WAQI_API_TOKEN not configured.")
        return token

    def fetch_current_aqi(
        self,
        *,
        lat: float,
        lng: float,
        location_label: str,
    ) -> CurrentAirQuality:
        token = self._resolve_token()
        url = _WAQI_GEO_URL.format(lat=f"{lat:.4f}", lng=f"{lng:.4f}")

        client = self._http_client or create_http_client()
        close_after = self._http_client is None
        try:
            response = client.get(url, params={"token": token})
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:  # noqa: BLE001
            raise UpstreamProviderError(self.provider_name, f"Request failed: {exc}") from exc
        finally:
            if close_after:
                client.close()

        if not isinstance(payload, dict) or payload.get("status") != "ok":
            raise UpstreamProviderError(self.provider_name, "Upstream returned non-ok status.")

        data = payload.get("data")
        if not isinstance(data, dict):
            raise UpstreamProviderError(self.provider_name, "Missing data object in response.")

        return self._parse_station_payload(data, location_label=location_label)

    def _parse_station_payload(
        self,
        data: dict[str, Any],
        *,
        location_label: str,
    ) -> CurrentAirQuality:
        city_info = data.get("city") if isinstance(data.get("city"), dict) else {}
        station_name = city_info.get("name")
        source_label = (
            f"WAQI / CPCB Station - {station_name}"
            if isinstance(station_name, str) and station_name.strip()
            else self.provider_name
        )

        time_info = data.get("time") if isinstance(data.get("time"), dict) else {}
        observed_dt = parse_iso_utc(time_info.get("iso"))
        observed_iso = to_iso_utc(observed_dt)
        freshness = FreshnessStatus(classify_freshness(observed_dt, max_fresh_minutes=90))

        iaqi = data.get("iaqi") if isinstance(data.get("iaqi"), dict) else {}
        pm25 = _to_optional_float((iaqi.get("pm25") or {}).get("v"))
        pm10 = _to_optional_float((iaqi.get("pm10") or {}).get("v"))

        # Derive CPCB NAQI deterministically when raw particulate sub-values are present,
        # otherwise use station-reported AQI if numeric (never fabricate).
        raw_station_aqi = _to_optional_float(data.get("aqi"))
        derived_aqi, derived_dominant = derive_naqi_from_pollutants(pm25=pm25, pm10=pm10)

        if raw_station_aqi is not None:
            aqi_value: int | None = round(raw_station_aqi)
            dominant = (
                str(data.get("dominentpol")).lower()
                if data.get("dominentpol")
                else derived_dominant
            )
        else:
            aqi_value = derived_aqi
            dominant = derived_dominant

        category = (
            AqiCategory.UNAVAILABLE
            if aqi_value is None or freshness == FreshnessStatus.UNAVAILABLE
            else classify_cpcb_naqi(aqi_value)
        )

        readings = [
            PollutantReading(
                location=location_label,
                pollutant="PM2.5",
                value=round(pm25, 1) if pm25 is not None else None,
                unit="µg/m³",
                observed_at=observed_iso,
                source=source_label,
                freshness_status=freshness if pm25 is not None else FreshnessStatus.UNAVAILABLE,
            ),
            PollutantReading(
                location=location_label,
                pollutant="PM10",
                value=round(pm10, 1) if pm10 is not None else None,
                unit="µg/m³",
                observed_at=observed_iso,
                source=source_label,
                freshness_status=freshness if pm10 is not None else FreshnessStatus.UNAVAILABLE,
            ),
        ]

        return CurrentAirQuality(
            aqi=aqi_value,
            aqi_scale="CPCB_NAQI",
            category=category,
            dominant_pollutant=dominant,
            health_guidance=get_default_health_guidance(category),
            readings=readings,
            observed_at=observed_iso,
            source=source_label,
            freshness_status=freshness if aqi_value is not None else FreshnessStatus.UNAVAILABLE,
        )
