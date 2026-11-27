"""Unit tests for the 3 new deterministic domain tools (My Impact, Family Schedule, City Pollutants)."""

from __future__ import annotations

from app.domain.risk_engine import assess_risk
from app.graph.tools.domain_tools import (
    TOOL_REGISTRY,
    analyze_city_pollutants_and_weather,
    analyze_family_schedule_risks,
    analyze_my_impact_history,
)
from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import (
    AirQualityResponse,
    CurrentAirQuality,
    ForecastPoint,
    PollutantReading,
    WeatherSnapshot,
)
from app.schemas.profile import SanitizedContext


def _make_env(
    *,
    aqi: int | None = 240,
    category: AqiCategory = AqiCategory.POOR,
    pm25: float | None = 115.0,
    pm10: float | None = 160.0,
    no2: float | None = None,
    wind_kmh: float | None = 4.2,
    humidity_pct: float | None = 78.0,
    forecasts: list[ForecastPoint] | None = None,
) -> AirQualityResponse:
    readings = [
        PollutantReading(
            location="New Delhi",
            pollutant="PM2.5",
            value=pm25,
            unit="µg/m³",
            observed_at="2026-11-27T08:00:00Z" if pm25 is not None else None,
            source="WAQI",
            freshness_status=FreshnessStatus.FRESH
            if pm25 is not None
            else FreshnessStatus.UNAVAILABLE,
        ),
        PollutantReading(
            location="New Delhi",
            pollutant="PM10",
            value=pm10,
            unit="µg/m³",
            observed_at="2026-11-27T08:00:00Z" if pm10 is not None else None,
            source="WAQI",
            freshness_status=FreshnessStatus.FRESH
            if pm10 is not None
            else FreshnessStatus.UNAVAILABLE,
        ),
        PollutantReading(
            location="New Delhi",
            pollutant="NO2",
            value=no2,
            unit="µg/m³",
            observed_at="2026-11-27T08:00:00Z" if no2 is not None else None,
            source="WAQI",
            freshness_status=FreshnessStatus.FRESH
            if no2 is not None
            else FreshnessStatus.UNAVAILABLE,
        ),
    ]
    return AirQualityResponse(
        location_id="new-delhi-in",
        location_name="New Delhi",
        current=CurrentAirQuality(
            aqi=aqi,
            category=category,
            dominant_pollutant="PM2.5" if aqi is not None else None,
            health_guidance="Limit prolonged outdoor exertion.",
            readings=readings,
            observed_at="2026-11-27T08:00:00Z" if aqi is not None else None,
            source="WAQI",
            freshness_status=FreshnessStatus.FRESH
            if aqi is not None
            else FreshnessStatus.UNAVAILABLE,
        ),
        weather=WeatherSnapshot(
            temp_c=19.5,
            humidity_pct=humidity_pct,
            wind_speed_kmh=wind_kmh,
            observed_at="2026-11-27T08:00:00Z",
            source="Open-Meteo",
            freshness_status=FreshnessStatus.FRESH,
        ),
        forecasts=forecasts or [],
    )


def test_tool_registry_contains_all_seven_tools() -> None:
    assert len(TOOL_REGISTRY) == 7
    assert "analyze_my_impact_history" in TOOL_REGISTRY
    assert "analyze_family_schedule_risks" in TOOL_REGISTRY
    assert "analyze_city_pollutants_and_weather" in TOOL_REGISTRY


def test_analyze_my_impact_history_separates_emissions_and_exposure() -> None:
    env = _make_env(aqi=120, category=AqiCategory.MODERATE)
    risk = assess_risk(current_aqi=env.current, context=SanitizedContext(), forecasts=[])
    summary = {
        "windowDays": 14,
        "emissions": {
            "totalEstimatedCo2AvoidedKg": 6.4,
            "actionCount": 4,
            "byActionTypeKg": {"public_transit": 4.2, "carpool": 2.2},
            "isEstimate": True,
        },
        "exposure": {
            "totalProtectiveActions": 3,
            "totalProtectedMinutes": 135,
            "byActionTypeCount": {"indoor_exercise_swap": 2, "hepa_run": 1},
        },
        "dailySeries": [
            {"date": "2026-11-25", "estimatedCo2Kg": 1.6, "exposureActions": 0},
            {"date": "2026-11-26", "estimatedCo2Kg": 0.0, "exposureActions": 1},
            {"date": "2026-11-27", "estimatedCo2Kg": 1.6, "exposureActions": 1},
        ],
        "recentLogs": [{"loggedDate": "2026-11-27"}],
    }

    result = analyze_my_impact_history(impact_summary=summary, risk=risk)
    assert result["hasHistory"] is True
    assert result["emissions"]["totalEstimatedCo2AvoidedKg"] == 6.4
    assert result["emissions"]["topActionType"] == "public_transit"
    assert result["emissions"]["isEstimate"] is True
    assert result["emissions"]["projectedWeeklyIfRepeated2xKg"] == 3.2
    assert result["exposure"]["totalProtectiveActions"] == 3
    assert result["exposure"]["totalProtectedMinutes"] == 135
    assert result["currentStreakDays"] == 3
    assert result["activeDaysLast14"] == 3
    assert result["lastLoggedDate"] == "2026-11-27"
    assert "separately" in result["separationNote"].lower()


def test_analyze_my_impact_history_empty_honest_response() -> None:
    env = _make_env(aqi=280, category=AqiCategory.POOR)
    risk = assess_risk(current_aqi=env.current, context=SanitizedContext(), forecasts=[])

    result = analyze_my_impact_history(impact_summary=None, risk=risk)
    assert result["hasHistory"] is False
    assert result["emissions"]["totalEstimatedCo2AvoidedKg"] == 0.0
    assert result["exposure"]["totalProtectiveActions"] == 0
    assert result["currentStreakDays"] == 0


def test_analyze_family_schedule_risks_matches_hourly_forecast_without_pii() -> None:
    forecasts = [
        ForecastPoint(
            forecast_for="2026-11-27T08:00:00Z",
            pm25=125.0,
            pm10=180.0,
            estimated_naqi=260,
            source="Open-Meteo",
        ),
        ForecastPoint(
            forecast_for="2026-11-27T15:00:00Z",
            pm25=45.0,
            pm10=70.0,
            estimated_naqi=78,
            source="Open-Meteo",
        ),
    ]
    env = _make_env(aqi=240, category=AqiCategory.POOR, forecasts=forecasts)
    ctx = SanitizedContext(
        profile_complete=True,
        member_descriptors=["child_school (6_12)", "elderly (60_plus)"],
        member_schedule_hints=[
            "child school: leaves ~07:30, returns ~15:00",
            "elderly: outdoor ~07:45",
        ],
        has_children=True,
        has_elderly=True,
        exercise_window="morning",
        exercise_activity_type="walk",
        prefers_outdoor_exercise=True,
    )
    risk = assess_risk(current_aqi=env.current, context=ctx, forecasts=forecasts)

    result = analyze_family_schedule_risks(context=ctx, env=env, risk=risk)
    assert result["forecastAvailable"] is True
    assert result["householdMemberCount"] == 2
    assert len(result["scheduleRisks"]) >= 2
    # Morning school/walk slots should map to the 08:00 forecast (AQI 260 -> high risk)
    morning_slot = result["scheduleRisks"][0]
    assert morning_slot["projectedAqi"] == 260
    assert morning_slot["riskLevel"] == "high"
    # Afternoon return slot maps to 15:00 forecast (AQI 78 -> low risk)
    afternoon_slot = result["scheduleRisks"][1]
    assert afternoon_slot["projectedAqi"] == 78
    assert afternoon_slot["riskLevel"] == "low"
    assert result["exercisePreference"]["projectedAqi"] == 260


def test_analyze_family_schedule_risks_no_forecast_never_claims_cleaner_hours() -> None:
    env = _make_env(aqi=220, category=AqiCategory.POOR, forecasts=[])
    ctx = SanitizedContext(
        profile_complete=True,
        member_descriptors=["child_school (6_12)"],
        member_schedule_hints=["child school: leaves ~08:00"],
        has_children=True,
    )
    risk = assess_risk(current_aqi=env.current, context=ctx, forecasts=[])

    result = analyze_family_schedule_risks(context=ctx, env=env, risk=risk)
    assert result["forecastAvailable"] is False
    assert result["cleanerForecastHours"] == []
    assert "without claiming safer hours" in result["summary"]


def test_analyze_city_pollutants_and_weather_computes_ratio_dispersion_and_unavailable() -> None:
    env = _make_env(
        aqi=250,
        category=AqiCategory.POOR,
        pm25=120.0,
        pm10=160.0,
        no2=None,
        wind_kmh=4.0,
        humidity_pct=82.0,
    )
    risk = assess_risk(current_aqi=env.current, context=SanitizedContext(), forecasts=[])

    result = analyze_city_pollutants_and_weather(env=env, risk=risk)
    assert result["pm25ToPm10Ratio"] == 0.75
    assert result["particleSignature"] == "fine_combustion_smog"
    assert result["windDispersion"] == "stagnant_trapping"
    assert result["humidityNote"] == "high_humidity_haze"
    assert result["measuredPollutants"] == {"PM2.5": 120.0, "PM10": 160.0}
    assert result["unavailablePollutants"] == ["NO2"]


def test_analyze_city_pollutants_coarse_dust_and_active_clearing() -> None:
    env = _make_env(
        aqi=180,
        category=AqiCategory.MODERATE,
        pm25=40.0,
        pm10=180.0,
        no2=22.0,
        wind_kmh=19.5,
        humidity_pct=25.0,
    )
    risk = assess_risk(current_aqi=env.current, context=SanitizedContext(), forecasts=[])

    result = analyze_city_pollutants_and_weather(env=env, risk=risk)
    assert result["pm25ToPm10Ratio"] == 0.22
    assert result["particleSignature"] == "coarse_dust_dominant"
    assert result["windDispersion"] == "active_clearing"
    assert result["humidityNote"] == "dry_dust_prone"
    assert result["unavailablePollutants"] == []
