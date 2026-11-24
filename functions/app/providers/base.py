"""Protocol interfaces for swappable, testable external data & LLM providers."""

from __future__ import annotations

from typing import Protocol, TypeVar

from pydantic import BaseModel

from app.schemas.environment import (
    CurrentAirQuality,
    ForecastPoint,
    LocationResult,
    WeatherSnapshot,
)

TModel = TypeVar("TModel", bound=BaseModel)


class AirQualityProvider(Protocol):
    """Contract for primary or fallback real-time AQI providers (WAQI, CPCB, Open-Meteo)."""

    provider_name: str

    def fetch_current_aqi(
        self,
        *,
        lat: float,
        lng: float,
        location_label: str,
    ) -> CurrentAirQuality: ...


class WeatherAndForecastProvider(Protocol):
    """Contract for current weather + hourly AQ forecast providers (Open-Meteo)."""

    provider_name: str

    def fetch_weather_and_forecasts(
        self,
        *,
        lat: float,
        lng: float,
        location_label: str,
    ) -> tuple[WeatherSnapshot, list[ForecastPoint]]: ...


class LocationProvider(Protocol):
    """Contract for city/locality search & geocoding providers (Google Maps / fallback)."""

    provider_name: str

    def search_locations(self, query: str) -> list[LocationResult]: ...


class StructuredLLMProvider(Protocol):
    """Contract for structured JSON generation (Google Gemini)."""

    provider_name: str

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_schema: type[TModel],
    ) -> TModel: ...
