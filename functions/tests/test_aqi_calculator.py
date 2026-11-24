"""Unit tests for deterministic India CPCB NAQI calculator."""

from __future__ import annotations

import pytest

from app.domain.aqi_calculator import (
    classify_cpcb_naqi,
    compute_pm10_sub_index,
    compute_pm25_sub_index,
    derive_naqi_from_pollutants,
)
from app.schemas.common import AqiCategory


def test_cpcb_pm25_breakpoints() -> None:
    assert compute_pm25_sub_index(0.0) == 0
    assert compute_pm25_sub_index(30.0) == 50
    assert compute_pm25_sub_index(60.0) == 100
    assert compute_pm25_sub_index(90.0) == 200
    assert compute_pm25_sub_index(120.0) == 300
    assert compute_pm25_sub_index(250.0) == 400
    assert compute_pm25_sub_index(600.0) == 500


def test_cpcb_pm10_breakpoints() -> None:
    assert compute_pm10_sub_index(50.0) == 50
    assert compute_pm10_sub_index(100.0) == 100
    assert compute_pm10_sub_index(250.0) == 200
    assert compute_pm10_sub_index(430.0) == 400


def test_negative_concentration_raises() -> None:
    with pytest.raises(ValueError):
        compute_pm25_sub_index(-5.0)


def test_classify_cpcb_naqi_categories() -> None:
    assert classify_cpcb_naqi(None) == AqiCategory.UNAVAILABLE
    assert classify_cpcb_naqi(35) == AqiCategory.GOOD
    assert classify_cpcb_naqi(85) == AqiCategory.SATISFACTORY
    assert classify_cpcb_naqi(160) == AqiCategory.MODERATE
    assert classify_cpcb_naqi(260) == AqiCategory.POOR
    assert classify_cpcb_naqi(350) == AqiCategory.VERY_POOR
    assert classify_cpcb_naqi(445) == AqiCategory.SEVERE


def test_derive_naqi_selects_dominant_pollutant() -> None:
    aqi, dominant = derive_naqi_from_pollutants(pm25=185.0, pm10=120.0)
    assert dominant == "pm25"
    assert aqi is not None and 301 <= aqi <= 400

    none_aqi, none_dom = derive_naqi_from_pollutants(pm25=None, pm10=None)
    assert none_aqi is None
    assert none_dom is None
