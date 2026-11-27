"""Centralized typed runtime configuration for BreatheWise AI backend."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True, slots=True)
class AppSettings:
    """Immutable application settings loaded once per instance."""

    service_name: str = "breathewise-ai-api"
    api_version: str = "1.0.0"
    firebase_project_id: str = "agentora-ai-v2"
    region: str = "asia-south1"
    environment: str = "development"

    # Cache TTLs (PRD §9 & docs/ARCHITECTURE.md)
    aqi_cache_ttl_minutes: int = 30
    forecast_cache_ttl_minutes: int = 180
    geocode_cache_ttl_minutes: int = 1440

    # Execution & outbound timeouts (PRD §12)
    http_timeout_seconds: float = 8.0
    gemini_timeout_seconds: float = 20.0
    graph_max_validation_retries: int = 1

    # AI model configuration
    gemini_model: str = "gemini-2.5-flash-lite"

    # CORS allowed origins (comma-separated or '*')
    cors_allowed_origin: str = "*"


@lru_cache(maxsize=1)
def get_settings() -> AppSettings:
    """Return cached runtime settings constructed from environment variables."""
    return AppSettings(
        firebase_project_id=os.getenv(
            "GOOGLE_CLOUD_PROJECT",
            os.getenv("FIREBASE_PROJECT_ID", "agentora-ai-v2"),
        ),
        region=os.getenv("BREATHEWISE_REGION", "asia-south1"),
        environment=os.getenv("BREATHEWISE_ENV", "development"),
        aqi_cache_ttl_minutes=int(os.getenv("AQI_CACHE_TTL_MINUTES", "30")),
        forecast_cache_ttl_minutes=int(os.getenv("FORECAST_CACHE_TTL_MINUTES", "180")),
        http_timeout_seconds=float(os.getenv("HTTP_TIMEOUT_SECONDS", "8.0")),
        gemini_timeout_seconds=float(os.getenv("GEMINI_TIMEOUT_SECONDS", "20.0")),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        cors_allowed_origin=os.getenv("CORS_ALLOWED_ORIGIN", "*"),
    )
