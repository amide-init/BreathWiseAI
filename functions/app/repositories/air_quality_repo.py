"""Firestore cache repository for `air_quality/{locationId}` and `forecasts/{hourKey}`."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.repositories.base_repo import BaseFirestoreRepository
from app.schemas.environment import CurrentAirQuality, ForecastPoint, WeatherSnapshot
from app.utils.datetime_utils import parse_iso_utc, to_iso_utc, utc_now
from app.utils.logger import log_event


@dataclass(frozen=True, slots=True)
class CachedAirQualityRecord:
    """Deserialized Firestore cache record for a location."""

    location_id: str
    location_name: str
    current: CurrentAirQuality
    weather: WeatherSnapshot
    forecasts: list[ForecastPoint]
    fetched_at: datetime | None
    fallback_provider_used: bool = False


class AirQualityRepository(BaseFirestoreRepository):
    """Cache-first persistence adapter for shared environmental readings."""

    COLLECTION = "air_quality"

    def get_cached(self, location_id: str) -> CachedAirQualityRecord | None:
        """Read cached air_quality/{locationId} and its forecasts subcollection."""
        try:
            doc_ref = self.db.collection(self.COLLECTION).document(location_id)
            snap = doc_ref.get()
            if not snap.exists:
                return None

            data = snap.to_dict() or {}
            current = CurrentAirQuality.model_validate(data["current"])
            weather = WeatherSnapshot.model_validate(data["weather"])
            fetched_at = _coerce_datetime(data.get("fetchedAt"))

            forecast_docs = (
                doc_ref.collection("forecasts").order_by("forecastFor").limit(24).stream()
            )
            forecasts = [
                ForecastPoint.model_validate(f_doc.to_dict())
                for f_doc in forecast_docs
                if f_doc.exists
            ]

            return CachedAirQualityRecord(
                location_id=location_id,
                location_name=str(data.get("locationName") or location_id),
                current=current,
                weather=weather,
                forecasts=forecasts,
                fetched_at=fetched_at,
                fallback_provider_used=bool(data.get("fallbackProviderUsed", False)),
            )
        except Exception as exc:  # noqa: BLE001 - Degrade cleanly if Firestore unavailable
            log_event(
                "air_quality_cache_read_failed",
                level=logging.WARNING,
                location_id=location_id,
                error=str(exc),
            )
            return None

    def save_cached(
        self,
        *,
        location_id: str,
        location_name: str,
        lat: float,
        lng: float,
        current: CurrentAirQuality,
        weather: WeatherSnapshot,
        forecasts: list[ForecastPoint],
        fallback_provider_used: bool,
    ) -> None:
        """Persist fresh observations and hourly forecasts into Firestore cache."""
        try:
            now = utc_now()
            doc_ref = self.db.collection(self.COLLECTION).document(location_id)
            doc_ref.set(
                {
                    "locationId": location_id,
                    "locationName": location_name,
                    "lat": lat,
                    "lng": lng,
                    "current": current.model_dump(by_alias=True),
                    "weather": weather.model_dump(by_alias=True),
                    "fallbackProviderUsed": fallback_provider_used,
                    "fetchedAt": to_iso_utc(now),
                },
                merge=True,
            )

            if forecasts:
                batch = self.db.batch()
                for point in forecasts[:24]:
                    hour_key = point.forecast_for[:13].replace(":", "-")
                    f_ref = doc_ref.collection("forecasts").document(hour_key)
                    batch.set(f_ref, point.model_dump(by_alias=True))
                batch.commit()
        except Exception as exc:  # noqa: BLE001 - Never block live response on cache write error
            log_event(
                "air_quality_cache_write_failed",
                level=logging.WARNING,
                location_id=location_id,
                error=str(exc),
            )


def _coerce_datetime(raw: Any) -> datetime | None:
    if isinstance(raw, datetime):
        return raw
    if isinstance(raw, str):
        return parse_iso_utc(raw)
    return None
