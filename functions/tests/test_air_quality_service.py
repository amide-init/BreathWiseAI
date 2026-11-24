"""Unit tests for cache-first AirQualityService, fallback chain, stale & unavailable honesty."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.repositories.air_quality_repo import CachedAirQualityRecord
from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import (
    CurrentAirQuality,
    ForecastPoint,
    PollutantReading,
    WeatherSnapshot,
)
from app.services.air_quality_service import AirQualityService
from app.utils.errors import UpstreamProviderError


class FakeAirQualityRepo:
    def __init__(self, cached: CachedAirQualityRecord | None = None) -> None:
        self.cached = cached
        self.saved_count = 0

    def get_cached(self, _location_id: str) -> CachedAirQualityRecord | None:
        return self.cached

    def save_cached(self, **_kwargs: object) -> None:
        self.saved_count += 1


class StubAqiProvider:
    provider_name = "StubAQI"

    def __init__(self, result: CurrentAirQuality | None = None, fail: bool = False) -> None:
        self._result = result
        self._fail = fail
        self.calls = 0

    def fetch_current_aqi(
        self, *, lat: float, lng: float, location_label: str
    ) -> CurrentAirQuality:
        self.calls += 1
        if self._fail or self._result is None:
            raise UpstreamProviderError(self.provider_name, "Simulated outage")
        return self._result


class StubWeatherProvider:
    provider_name = "StubWeather"

    def __init__(self, fail: bool = False) -> None:
        self._fail = fail
        self.calls = 0

    def fetch_weather_and_forecasts(
        self, *, lat: float, lng: float, location_label: str
    ) -> tuple[WeatherSnapshot, list[ForecastPoint]]:
        self.calls += 1
        if self._fail:
            raise UpstreamProviderError(self.provider_name, "Simulated weather outage")
        return (
            WeatherSnapshot(
                temp_c=19.2,
                humidity_pct=68.0,
                wind_speed_kmh=7.4,
                wind_direction_deg=305.0,
                observed_at="2026-11-25T05:00:00Z",
                source="Open-Meteo",
                freshness_status=FreshnessStatus.FRESH,
            ),
            [
                ForecastPoint(
                    forecast_for="2026-11-25T06:00:00Z",
                    pm25=145.0,
                    pm10=240.0,
                    estimated_naqi=319,
                    temp_c=20.0,
                    wind_speed_kmh=8.0,
                    source="Open-Meteo Air Quality Forecast",
                )
            ],
        )


def _fresh_aqi(aqi: int = 342, source: str = "WAQI / CPCB Station") -> CurrentAirQuality:
    return CurrentAirQuality(
        aqi=aqi,
        category=AqiCategory.VERY_POOR,
        dominant_pollutant="pm25",
        health_guidance="Avoid strenuous outdoor exercise.",
        readings=[
            PollutantReading(
                location="New Delhi",
                pollutant="PM2.5",
                value=176.4,
                unit="µg/m³",
                observed_at="2026-11-25T05:00:00Z",
                source=source,
                freshness_status=FreshnessStatus.FRESH,
            )
        ],
        observed_at="2026-11-25T05:00:00Z",
        source=source,
        freshness_status=FreshnessStatus.FRESH,
    )


def test_returns_fresh_cache_without_calling_external_providers() -> None:
    now = datetime(2026, 11, 25, 5, 15, tzinfo=UTC)
    cached = CachedAirQualityRecord(
        location_id="in-new-delhi-28.61-77.21",
        location_name="New Delhi, Delhi, India",
        current=_fresh_aqi(),
        weather=WeatherSnapshot(
            temp_c=18.5,
            humidity_pct=70.0,
            wind_speed_kmh=6.0,
            source="Open-Meteo",
            freshness_status=FreshnessStatus.FRESH,
        ),
        forecasts=[],
        fetched_at=now - timedelta(minutes=10),
    )
    primary = StubAqiProvider(result=_fresh_aqi(999))
    weather = StubWeatherProvider()

    service = AirQualityService(
        repository=FakeAirQualityRepo(cached),  # type: ignore[arg-type]
        primary_aqi_provider=primary,
        fallback_aqi_provider=StubAqiProvider(fail=True),
        weather_provider=weather,
    )
    resp = service.get_air_quality(
        location_id="in-new-delhi-28.61-77.21",
        lat=28.6139,
        lng=77.209,
        location_label="New Delhi, Delhi, India",
        now=now,
    )
    assert resp.current.aqi == 342
    assert resp.current.freshness_status == FreshnessStatus.FRESH
    assert primary.calls == 0
    assert weather.calls == 0


def test_falls_back_to_open_meteo_when_primary_waqi_fails() -> None:
    repo = FakeAirQualityRepo(cached=None)
    fallback = StubAqiProvider(result=_fresh_aqi(290, source="Open-Meteo Air Quality (Fallback)"))
    service = AirQualityService(
        repository=repo,  # type: ignore[arg-type]
        primary_aqi_provider=StubAqiProvider(fail=True),
        fallback_aqi_provider=fallback,
        weather_provider=StubWeatherProvider(),
    )
    resp = service.get_air_quality(
        location_id="in-new-delhi-28.61-77.21",
        lat=28.6139,
        lng=77.209,
        location_label="New Delhi, Delhi, India",
    )
    assert resp.current.aqi == 290
    assert resp.fallback_provider_used is True
    assert repo.saved_count == 1


def test_serves_explicitly_stale_cache_when_all_providers_fail() -> None:
    now = datetime(2026, 11, 25, 7, 0, tzinfo=UTC)
    cached = CachedAirQualityRecord(
        location_id="in-new-delhi-28.61-77.21",
        location_name="New Delhi, Delhi, India",
        current=_fresh_aqi(342),
        weather=WeatherSnapshot(
            temp_c=18.5,
            source="Open-Meteo",
            freshness_status=FreshnessStatus.FRESH,
        ),
        forecasts=[],
        fetched_at=now - timedelta(hours=2),
    )
    service = AirQualityService(
        repository=FakeAirQualityRepo(cached),  # type: ignore[arg-type]
        primary_aqi_provider=StubAqiProvider(fail=True),
        fallback_aqi_provider=StubAqiProvider(fail=True),
        weather_provider=StubWeatherProvider(fail=True),
    )
    resp = service.get_air_quality(
        location_id="in-new-delhi-28.61-77.21",
        lat=28.6139,
        lng=77.209,
        location_label="New Delhi, Delhi, India",
        now=now,
    )
    assert resp.current.aqi == 342
    assert resp.current.freshness_status == FreshnessStatus.STALE
    assert resp.weather.freshness_status == FreshnessStatus.STALE


def test_returns_honest_unavailable_with_no_fabricated_numbers_when_empty_cache_and_outage() -> (
    None
):
    service = AirQualityService(
        repository=FakeAirQualityRepo(cached=None),  # type: ignore[arg-type]
        primary_aqi_provider=StubAqiProvider(fail=True),
        fallback_aqi_provider=StubAqiProvider(fail=True),
        weather_provider=StubWeatherProvider(fail=True),
    )
    resp = service.get_air_quality(
        location_id="in-new-delhi-28.61-77.21",
        lat=28.6139,
        lng=77.209,
        location_label="New Delhi, Delhi, India",
    )
    assert resp.current.aqi is None
    assert resp.current.category == AqiCategory.UNAVAILABLE
    assert resp.current.freshness_status == FreshnessStatus.UNAVAILABLE
    assert all(r.value is None for r in resp.current.readings)
