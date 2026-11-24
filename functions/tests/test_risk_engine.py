"""Unit tests for Node 3 deterministic risk assessment engine."""

from __future__ import annotations

from app.domain.risk_engine import assess_risk
from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import CurrentAirQuality, ForecastPoint
from app.schemas.profile import SanitizedContext


def _make_aqi(
    aqi: int | None,
    category: AqiCategory,
    freshness: FreshnessStatus = FreshnessStatus.FRESH,
) -> CurrentAirQuality:
    return CurrentAirQuality(
        aqi=aqi,
        category=category,
        health_guidance="Guidance",
        source="WAQI / CPCB",
        freshness_status=freshness,
    )


def test_severe_aqi_with_child_enforces_strict_constraints_and_medical_escalation() -> None:
    result = assess_risk(
        current_aqi=_make_aqi(425, AqiCategory.SEVERE),
        context=SanitizedContext(has_children=True),
    )
    assert result.severity_tier == AqiCategory.SEVERE
    assert result.sensitive_groups_present is True
    assert result.constraints.allow_strenuous_outdoor is False
    assert result.constraints.allow_child_outdoor_play is False
    assert result.constraints.recommend_mask_outdoors is True
    assert result.constraints.recommend_windows_closed is True
    assert result.constraints.medical_escalation_required is True
    assert result.constraints.allow_specific_safe_window_claims is False


def test_moderate_aqi_escalates_for_sensitive_household_only() -> None:
    healthy_result = assess_risk(
        current_aqi=_make_aqi(150, AqiCategory.MODERATE),
        context=SanitizedContext(),
    )
    sensitive_result = assess_risk(
        current_aqi=_make_aqi(150, AqiCategory.MODERATE),
        context=SanitizedContext(has_elderly=True, has_respiratory_or_cardiac_sensitivity=True),
    )
    assert healthy_result.constraints.allow_strenuous_outdoor is True
    assert sensitive_result.constraints.allow_strenuous_outdoor is False
    assert sensitive_result.constraints.recommend_hepa_if_owned is True


def test_stale_data_blocks_safe_window_claims_even_with_good_forecast() -> None:
    forecasts = [
        ForecastPoint(
            forecast_for="2026-11-25T10:00:00Z",
            estimated_naqi=75,
            source="Open-Meteo",
        )
    ]
    result = assess_risk(
        current_aqi=_make_aqi(210, AqiCategory.POOR, freshness=FreshnessStatus.STALE),
        context=SanitizedContext(),
        forecasts=forecasts,
    )
    assert result.constraints.require_freshness_caveat is True
    assert result.constraints.allow_specific_safe_window_claims is False
    assert result.safe_forecast_windows == []


def test_fresh_good_forecast_enables_grounded_safe_windows() -> None:
    forecasts = [
        ForecastPoint(forecast_for="2026-11-25T08:00:00Z", estimated_naqi=260, source="Open-Meteo"),
        ForecastPoint(forecast_for="2026-11-25T14:00:00Z", estimated_naqi=88, source="Open-Meteo"),
    ]
    result = assess_risk(
        current_aqi=_make_aqi(220, AqiCategory.POOR, freshness=FreshnessStatus.FRESH),
        context=SanitizedContext(),
        forecasts=forecasts,
    )
    assert result.constraints.allow_specific_safe_window_claims is True
    assert result.safe_forecast_windows == ["2026-11-25T14:00:00Z"]


def test_acute_symptom_query_triggers_medical_escalation_at_good_aqi() -> None:
    result = assess_risk(
        current_aqi=_make_aqi(40, AqiCategory.GOOD),
        context=SanitizedContext(has_children=True),
        user_query="My child has wheezing and chest tightness, what inhaler dosage?",
    )
    assert result.constraints.medical_escalation_required is True


def test_unavailable_aqi_is_precautionary() -> None:
    result = assess_risk(
        current_aqi=_make_aqi(None, AqiCategory.UNAVAILABLE, freshness=FreshnessStatus.UNAVAILABLE),
        context=SanitizedContext(),
    )
    assert result.severity_tier == AqiCategory.UNAVAILABLE
    assert result.constraints.allow_strenuous_outdoor is False
    assert result.constraints.require_freshness_caveat is True
