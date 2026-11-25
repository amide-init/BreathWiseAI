"""Environmental data, location search, weather, and forecast schemas (PRD §9)."""

from __future__ import annotations

from pydantic import Field

from app.schemas.common import ApiModel, AqiCategory, FreshnessStatus, QuickDecision


class LocationResult(ApiModel):
    """Normalized geographic location returned by location search."""

    location_id: str
    city: str
    state: str = ""
    country: str = "India"
    label: str
    lat: float = Field(ge=-90.0, le=90.0)
    lng: float = Field(ge=-180.0, le=180.0)


class PollutantReading(ApiModel):
    """Single environmental observation carrying all 7 mandatory PRD §9 fields."""

    location: str
    pollutant: str
    value: float | None = None
    unit: str
    observed_at: str | None = None
    source: str
    freshness_status: FreshnessStatus


class WeatherSnapshot(ApiModel):
    """Current weather conditions accompanying AQI readings."""

    temp_c: float | None = None
    humidity_pct: float | None = None
    wind_speed_kmh: float | None = None
    wind_direction_deg: float | None = None
    observed_at: str | None = None
    source: str
    freshness_status: FreshnessStatus


class ForecastPoint(ApiModel):
    """Hourly pollution and weather forecast point (clearly marked as forecast)."""

    forecast_for: str
    pm25: float | None = None
    pm10: float | None = None
    estimated_naqi: int | None = None
    temp_c: float | None = None
    wind_speed_kmh: float | None = None
    source: str
    is_forecast: bool = True


class CurrentAirQuality(ApiModel):
    """Current normalized AQI summary and pollutant readings."""

    aqi: int | None = None
    aqi_scale: str = "CPCB_NAQI"
    category: AqiCategory = AqiCategory.UNAVAILABLE
    dominant_pollutant: str | None = None
    health_guidance: str
    readings: list[PollutantReading] = Field(default_factory=list)
    observed_at: str | None = None
    source: str
    freshness_status: FreshnessStatus


class AirQualityResponse(ApiModel):
    """Complete payload for GET /api/v1/air-quality."""

    location_id: str
    location_name: str
    current: CurrentAirQuality
    weather: WeatherSnapshot
    forecasts: list[ForecastPoint] = Field(default_factory=list)
    fallback_provider_used: bool = False
    quick_decisions: list[QuickDecision] = Field(default_factory=list)
