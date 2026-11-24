"""Open-Meteo Weather, Hourly Air-Quality Forecast & Fallback AQI Provider.

Zero API key required. Always distinguishes forecast points (`isForecast: true`)
from current observations and computes CPCB NAQI deterministically from PM2.5/PM10.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx

from app.domain.aqi_calculator import (
    classify_cpcb_naqi,
    derive_naqi_from_pollutants,
    get_default_health_guidance,
)
from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import (
    CurrentAirQuality,
    ForecastPoint,
    PollutantReading,
    WeatherSnapshot,
)
from app.utils.datetime_utils import classify_freshness, parse_iso_utc, to_iso_utc, utc_now
from app.utils.errors import UpstreamProviderError
from app.utils.http_client import create_http_client

_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
_AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"


def _opt_float(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class OpenMeteoProvider:
    """Open-Meteo adapter implementing both WeatherAndForecastProvider & AirQualityProvider."""

    provider_name = "Open-Meteo"

    def __init__(self, *, http_client: httpx.Client | None = None) -> None:
        self._http_client = http_client

    def _get_json(self, url: str, params: dict[str, Any]) -> dict[str, Any]:
        client = self._http_client or create_http_client()
        close_after = self._http_client is None
        try:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:  # noqa: BLE001
            raise UpstreamProviderError(self.provider_name, f"Request failed: {exc}") from exc
        finally:
            if close_after:
                client.close()

        if not isinstance(data, dict):
            raise UpstreamProviderError(self.provider_name, "Unexpected JSON response format.")
        return data

    def fetch_current_aqi(
        self,
        *,
        lat: float,
        lng: float,
        location_label: str,
    ) -> CurrentAirQuality:
        """Fetch current PM2.5/PM10 from Open-Meteo AQ API and derive CPCB NAQI deterministically."""
        payload = self._get_json(
            _AIR_QUALITY_URL,
            {
                "latitude": round(lat, 4),
                "longitude": round(lng, 4),
                "current": "pm2_5,pm10",
                "timezone": "UTC",
            },
        )
        current = payload.get("current") if isinstance(payload.get("current"), dict) else {}
        observed_dt = parse_iso_utc(current.get("time"))
        observed_iso = to_iso_utc(observed_dt)
        freshness = FreshnessStatus(classify_freshness(observed_dt, max_fresh_minutes=90))

        pm25 = _opt_float(current.get("pm2_5"))
        pm10 = _opt_float(current.get("pm10"))
        aqi_value, dominant = derive_naqi_from_pollutants(pm25=pm25, pm10=pm10)
        category = (
            AqiCategory.UNAVAILABLE
            if aqi_value is None or freshness == FreshnessStatus.UNAVAILABLE
            else classify_cpcb_naqi(aqi_value)
        )
        source_label = "Open-Meteo Air Quality (Fallback)"

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

    def fetch_weather_and_forecasts(
        self,
        *,
        lat: float,
        lng: float,
        location_label: str,  # noqa: ARG002 - satisfies protocol
    ) -> tuple[WeatherSnapshot, list[ForecastPoint]]:
        """Fetch current weather + next 24h hourly PM2.5/PM10 & weather forecast."""
        weather_payload = self._get_json(
            _WEATHER_URL,
            {
                "latitude": round(lat, 4),
                "longitude": round(lng, 4),
                "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m",
                "hourly": "temperature_2m,wind_speed_10m",
                "forecast_days": 2,
                "timezone": "UTC",
            },
        )
        weather = self._parse_current_weather(weather_payload)

        try:
            aq_payload = self._get_json(
                _AIR_QUALITY_URL,
                {
                    "latitude": round(lat, 4),
                    "longitude": round(lng, 4),
                    "hourly": "pm2_5,pm10",
                    "forecast_days": 2,
                    "timezone": "UTC",
                },
            )
            forecasts = self._merge_hourly_forecasts(weather_payload, aq_payload)
        except UpstreamProviderError:
            forecasts = []

        return weather, forecasts

    def _parse_current_weather(self, payload: dict[str, Any]) -> WeatherSnapshot:
        current = payload.get("current") if isinstance(payload.get("current"), dict) else {}
        observed_dt = parse_iso_utc(current.get("time"))
        observed_iso = to_iso_utc(observed_dt)
        temp = _opt_float(current.get("temperature_2m"))
        humidity = _opt_float(current.get("relative_humidity_2m"))
        wind_speed = _opt_float(current.get("wind_speed_10m"))
        wind_dir = _opt_float(current.get("wind_direction_10m"))

        has_any = any(v is not None for v in (temp, humidity, wind_speed))
        freshness = (
            FreshnessStatus(classify_freshness(observed_dt, max_fresh_minutes=90))
            if has_any
            else FreshnessStatus.UNAVAILABLE
        )

        return WeatherSnapshot(
            temp_c=round(temp, 1) if temp is not None else None,
            humidity_pct=round(humidity, 0) if humidity is not None else None,
            wind_speed_kmh=round(wind_speed, 1) if wind_speed is not None else None,
            wind_direction_deg=round(wind_dir, 0) if wind_dir is not None else None,
            observed_at=observed_iso,
            source="Open-Meteo",
            freshness_status=freshness,
        )

    def _merge_hourly_forecasts(
        self,
        weather_payload: dict[str, Any],
        aq_payload: dict[str, Any],
        *,
        max_hours: int = 24,
        now: datetime | None = None,
    ) -> list[ForecastPoint]:
        aq_hourly = aq_payload.get("hourly") if isinstance(aq_payload.get("hourly"), dict) else {}
        wx_hourly = (
            weather_payload.get("hourly") if isinstance(weather_payload.get("hourly"), dict) else {}
        )

        wx_by_time: dict[str, tuple[float | None, float | None]] = {}
        wx_times = wx_hourly.get("time") or []
        wx_temps = wx_hourly.get("temperature_2m") or []
        wx_winds = wx_hourly.get("wind_speed_10m") or []
        for idx, raw_t in enumerate(wx_times):
            t_iso = to_iso_utc(parse_iso_utc(raw_t))
            if t_iso:
                t_val = _opt_float(wx_temps[idx]) if idx < len(wx_temps) else None
                w_val = _opt_float(wx_winds[idx]) if idx < len(wx_winds) else None
                wx_by_time[t_iso] = (t_val, w_val)

        reference_now = now or utc_now()
        points: list[ForecastPoint] = []
        aq_times = aq_hourly.get("time") or []
        pm25_list = aq_hourly.get("pm2_5") or []
        pm10_list = aq_hourly.get("pm10") or []

        for idx, raw_t in enumerate(aq_times):
            dt = parse_iso_utc(raw_t)
            if dt is None or dt < reference_now:
                continue
            t_iso = to_iso_utc(dt)
            if not t_iso:
                continue

            pm25 = _opt_float(pm25_list[idx]) if idx < len(pm25_list) else None
            pm10 = _opt_float(pm10_list[idx]) if idx < len(pm10_list) else None
            naqi, _ = derive_naqi_from_pollutants(pm25=pm25, pm10=pm10)
            temp_c, wind_kmh = wx_by_time.get(t_iso, (None, None))

            points.append(
                ForecastPoint(
                    forecast_for=t_iso,
                    pm25=round(pm25, 1) if pm25 is not None else None,
                    pm10=round(pm10, 1) if pm10 is not None else None,
                    estimated_naqi=naqi,
                    temp_c=round(temp_c, 1) if temp_c is not None else None,
                    wind_speed_kmh=round(wind_kmh, 1) if wind_kmh is not None else None,
                    source="Open-Meteo Air Quality Forecast",
                    is_forecast=True,
                )
            )
            if len(points) >= max_hours:
                break

        return points
