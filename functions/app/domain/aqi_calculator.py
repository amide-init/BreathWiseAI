"""Deterministic India CPCB National Air Quality Index (NAQI) calculator.

Computes pollutant sub-indices via official CPCB linear interpolation tables
without relying on any LLM or external heuristic.
"""

from __future__ import annotations

from app.config.constants import (
    CPCB_CATEGORY_GUIDANCE,
    CPCB_PM10_BREAKPOINTS,
    CPCB_PM25_BREAKPOINTS,
)
from app.schemas.common import AqiCategory


def _compute_sub_index(
    concentration: float,
    breakpoints: tuple[tuple[float, float, int, int], ...],
) -> int:
    """Linearly interpolate a pollutant concentration into a CPCB NAQI sub-index."""
    if concentration < 0:
        raise ValueError("Pollutant concentration cannot be negative.")

    for c_low, c_high, i_low, i_high in breakpoints:
        if concentration <= c_high:
            if c_high == c_low:
                return i_high
            ratio = (concentration - c_low) / (c_high - c_low)
            return round(i_low + ratio * (i_high - i_low))

    # Above top breakpoint: cap linearly up to 500 per standard NAQI display scale
    return 500


def compute_pm25_sub_index(pm25_ug_m3: float) -> int:
    """Compute CPCB NAQI sub-index for PM2.5 (µg/m³)."""
    return _compute_sub_index(pm25_ug_m3, CPCB_PM25_BREAKPOINTS)


def compute_pm10_sub_index(pm10_ug_m3: float) -> int:
    """Compute CPCB NAQI sub-index for PM10 (µg/m³)."""
    return _compute_sub_index(pm10_ug_m3, CPCB_PM10_BREAKPOINTS)


def classify_cpcb_naqi(aqi: int | None) -> AqiCategory:
    """Map numeric CPCB NAQI (0-500+) to its official severity category."""
    if aqi is None:
        return AqiCategory.UNAVAILABLE
    if aqi <= 50:
        return AqiCategory.GOOD
    if aqi <= 100:
        return AqiCategory.SATISFACTORY
    if aqi <= 200:
        return AqiCategory.MODERATE
    if aqi <= 300:
        return AqiCategory.POOR
    if aqi <= 400:
        return AqiCategory.VERY_POOR
    return AqiCategory.SEVERE


def derive_naqi_from_pollutants(
    *,
    pm25: float | None,
    pm10: float | None,
) -> tuple[int | None, str | None]:
    """Derive overall CPCB NAQI (max sub-index) and dominant pollutant when primary AQI is absent."""
    candidates: list[tuple[int, str]] = []
    if pm25 is not None and pm25 >= 0:
        candidates.append((compute_pm25_sub_index(pm25), "pm25"))
    if pm10 is not None and pm10 >= 0:
        candidates.append((compute_pm10_sub_index(pm10), "pm10"))
    if not candidates:
        return None, None
    aqi_value, dominant = max(candidates, key=lambda pair: pair[0])
    return aqi_value, dominant


def get_default_health_guidance(category: AqiCategory) -> str:
    """Return deterministic plain-language guidance for a CPCB category."""
    return CPCB_CATEGORY_GUIDANCE.get(category.value, CPCB_CATEGORY_GUIDANCE["Unavailable"])
