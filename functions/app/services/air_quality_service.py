"""Cache-first Environmental Data Service (PRD §9 & docs/ARCHITECTURE.md §4.1).

Resolution order:
1. Valid Firestore cache (age <= 30 min) -> return immediately (`freshnessStatus: fresh`)
2. Live primary WAQI/CPCB + Open-Meteo weather/forecast -> cache & return
3. Primary failure -> Open-Meteo AQ fallback (`fallbackProviderUsed: true`) -> cache & return
4. All live providers fail + expired cache exists -> return cached with `freshnessStatus: stale`
5. All live providers fail + no cache -> return explicit `freshnessStatus: unavailable` (zero fake data)
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from app.config.settings import AppSettings, get_settings
from app.domain.aqi_calculator import get_default_health_guidance
from app.domain.risk_engine import assess_risk
from app.providers.base import AirQualityProvider, WeatherAndForecastProvider
from app.providers.open_meteo_provider import OpenMeteoProvider
from app.providers.waqi_provider import WaqiAirQualityProvider
from app.repositories.air_quality_repo import AirQualityRepository, CachedAirQualityRecord
from app.schemas.common import AqiCategory, FreshnessStatus, QuickDecision
from app.schemas.environment import (
    AirQualityResponse,
    CurrentAirQuality,
    ForecastPoint,
    PollutantReading,
    WeatherSnapshot,
)
from app.schemas.profile import SanitizedContext
from app.utils.datetime_utils import is_cache_valid, utc_now
from app.utils.errors import UpstreamProviderError
from app.utils.logger import log_event
from app.utils.ttl_cache import AQI_L1_CACHE

_L1_AQI_TTL_MINUTES = 5


class AirQualityService:
    """Orchestrates cache-first environmental retrieval with strict freshness honesty."""

    def __init__(
        self,
        *,
        repository: AirQualityRepository | None = None,
        primary_aqi_provider: AirQualityProvider | None = None,
        fallback_aqi_provider: AirQualityProvider | None = None,
        weather_provider: WeatherAndForecastProvider | None = None,
        settings: AppSettings | None = None,
        use_l1_cache: bool | None = None,
    ) -> None:
        self._repo = repository or AirQualityRepository()
        self._primary_aqi = primary_aqi_provider or WaqiAirQualityProvider()
        self._fallback_aqi = fallback_aqi_provider or OpenMeteoProvider()
        self._weather_provider = weather_provider or OpenMeteoProvider()
        self._settings = settings or get_settings()
        # Enable process-local L1 cache by default in production; isolated in unit tests with custom repo stubs.
        self._use_l1_cache = (repository is None) if use_l1_cache is None else use_l1_cache

    def get_air_quality(
        self,
        *,
        location_id: str,
        lat: float,
        lng: float,
        location_label: str,
        force_refresh: bool = False,
        now: datetime | None = None,
    ) -> AirQualityResponse:
        reference_now = now or utc_now()

        # Tier 1: Sub-millisecond process-local L1 cache (5 min TTL, bypassed on force_refresh)
        if not force_refresh and self._use_l1_cache:
            l1_entry = AQI_L1_CACHE.get(location_id)
            if isinstance(l1_entry, tuple) and len(l1_entry) == 2:
                l1_fetched_at, l1_response = l1_entry
                l1_ttl = min(_L1_AQI_TTL_MINUTES, self._settings.aqi_cache_ttl_minutes)
                if (
                    isinstance(l1_fetched_at, datetime)
                    and isinstance(l1_response, AirQualityResponse)
                    and is_cache_valid(l1_fetched_at, l1_ttl, now=reference_now)
                    and l1_response.current.freshness_status == FreshnessStatus.FRESH
                ):
                    return l1_response

        cached = self._repo.get_cached(location_id)

        if (
            not force_refresh
            and cached is not None
            and is_cache_valid(
                cached.fetched_at,
                self._settings.aqi_cache_ttl_minutes,
                now=reference_now,
            )
            and cached.current.freshness_status == FreshnessStatus.FRESH
        ):
            response = AirQualityResponse(
                location_id=location_id,
                location_name=cached.location_name or location_label,
                current=cached.current,
                weather=cached.weather,
                forecasts=cached.forecasts,
                fallback_provider_used=cached.fallback_provider_used,
                quick_decisions=_baseline_quick_decisions(cached.current, cached.forecasts),
            )
            if self._use_l1_cache:
                AQI_L1_CACHE.set(location_id, (cached.fetched_at, response))
            return response

        # Fetch WAQI (primary/fallback AQI) and Open-Meteo (weather + hourly forecasts) in parallel
        with ThreadPoolExecutor(max_workers=2) as pool:
            aqi_future = pool.submit(
                self._fetch_live_aqi,
                lat=lat,
                lng=lng,
                location_label=location_label,
            )
            weather_future = pool.submit(
                self._fetch_live_weather_and_forecasts,
                lat=lat,
                lng=lng,
                location_label=location_label,
                cached=cached,
            )
            current_aqi, fallback_used = aqi_future.result()
            weather, forecasts = weather_future.result()

        # If live AQI succeeded, cache in L2 Firestore + L1 memory and return fresh response
        if current_aqi is not None and current_aqi.freshness_status != FreshnessStatus.UNAVAILABLE:
            self._repo.save_cached(
                location_id=location_id,
                location_name=location_label,
                lat=lat,
                lng=lng,
                current=current_aqi,
                weather=weather,
                forecasts=forecasts,
                fallback_provider_used=fallback_used,
            )
            response = AirQualityResponse(
                location_id=location_id,
                location_name=location_label,
                current=current_aqi,
                weather=weather,
                forecasts=forecasts,
                fallback_provider_used=fallback_used,
                quick_decisions=_baseline_quick_decisions(current_aqi, forecasts),
            )
            if self._use_l1_cache:
                AQI_L1_CACHE.set(location_id, (reference_now, response))
            return response

        # All live AQI providers failed: serve stale cache if available (explicitly marked STALE)
        if cached is not None:
            stale_current = _mark_current_stale(cached.current)
            stale_weather = (
                weather
                if weather.freshness_status == FreshnessStatus.FRESH
                else cached.weather.model_copy(update={"freshness_status": FreshnessStatus.STALE})
            )
            return AirQualityResponse(
                location_id=location_id,
                location_name=cached.location_name or location_label,
                current=stale_current,
                weather=stale_weather,
                forecasts=forecasts or cached.forecasts,
                fallback_provider_used=cached.fallback_provider_used,
                quick_decisions=_baseline_quick_decisions(
                    stale_current, forecasts or cached.forecasts
                ),
            )

        # No live data and no cache: return honest UNAVAILABLE state (zero fabricated readings)
        unavailable_aqi = _build_unavailable_aqi(location_label)
        return AirQualityResponse(
            location_id=location_id,
            location_name=location_label,
            current=unavailable_aqi,
            weather=weather,
            forecasts=forecasts,
            fallback_provider_used=False,
            quick_decisions=_baseline_quick_decisions(unavailable_aqi, forecasts),
        )

    def _fetch_live_aqi(
        self,
        *,
        lat: float,
        lng: float,
        location_label: str,
    ) -> tuple[CurrentAirQuality | None, bool]:
        try:
            reading = self._primary_aqi.fetch_current_aqi(
                lat=lat,
                lng=lng,
                location_label=location_label,
            )
            if reading.aqi is not None:
                return reading, False
        except UpstreamProviderError as exc:
            log_event(
                "primary_aqi_provider_failed",
                level=logging.WARNING,
                provider=exc.provider,
                message=exc.message,
            )

        try:
            fallback_reading = self._fallback_aqi.fetch_current_aqi(
                lat=lat,
                lng=lng,
                location_label=location_label,
            )
            if fallback_reading.aqi is not None:
                return fallback_reading, True
        except UpstreamProviderError as exc:
            log_event(
                "fallback_aqi_provider_failed",
                level=logging.WARNING,
                provider=exc.provider,
                message=exc.message,
            )

        return None, False

    def _fetch_live_weather_and_forecasts(
        self,
        *,
        lat: float,
        lng: float,
        location_label: str,
        cached: CachedAirQualityRecord | None,
    ) -> tuple[WeatherSnapshot, list[ForecastPoint]]:
        try:
            return self._weather_provider.fetch_weather_and_forecasts(
                lat=lat,
                lng=lng,
                location_label=location_label,
            )
        except UpstreamProviderError as exc:
            log_event(
                "weather_provider_failed",
                level=logging.WARNING,
                provider=exc.provider,
                message=exc.message,
            )
            if cached is not None:
                return (
                    cached.weather.model_copy(update={"freshness_status": FreshnessStatus.STALE}),
                    cached.forecasts,
                )
            return (
                WeatherSnapshot(
                    source="Open-Meteo",
                    freshness_status=FreshnessStatus.UNAVAILABLE,
                ),
                [],
            )


def _baseline_quick_decisions(
    current: CurrentAirQuality,
    forecasts: list[ForecastPoint],
) -> list[QuickDecision]:
    return assess_risk(
        current_aqi=current,
        context=SanitizedContext(),
        forecasts=forecasts,
    ).quick_decisions


def _mark_current_stale(current: CurrentAirQuality) -> CurrentAirQuality:
    stale_readings = [
        r.model_copy(
            update={
                "freshness_status": FreshnessStatus.STALE
                if r.value is not None
                else FreshnessStatus.UNAVAILABLE
            }
        )
        for r in current.readings
    ]
    return current.model_copy(
        update={
            "freshness_status": FreshnessStatus.STALE
            if current.aqi is not None
            else FreshnessStatus.UNAVAILABLE,
            "readings": stale_readings,
        }
    )


def _build_unavailable_aqi(location_label: str) -> CurrentAirQuality:
    return CurrentAirQuality(
        aqi=None,
        aqi_scale="CPCB_NAQI",
        category=AqiCategory.UNAVAILABLE,
        dominant_pollutant=None,
        health_guidance=get_default_health_guidance(AqiCategory.UNAVAILABLE),
        readings=[
            PollutantReading(
                location=location_label,
                pollutant="PM2.5",
                value=None,
                unit="µg/m³",
                observed_at=None,
                source="Station unavailable",
                freshness_status=FreshnessStatus.UNAVAILABLE,
            ),
            PollutantReading(
                location=location_label,
                pollutant="PM10",
                value=None,
                unit="µg/m³",
                observed_at=None,
                source="Station unavailable",
                freshness_status=FreshnessStatus.UNAVAILABLE,
            ),
        ],
        observed_at=None,
        source="Station unavailable",
        freshness_status=FreshnessStatus.UNAVAILABLE,
    )
