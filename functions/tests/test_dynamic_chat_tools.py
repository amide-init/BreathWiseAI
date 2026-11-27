"""Tests for dynamic Gemini Function Calling Chat (pull-on-demand deterministic tools + Node 7 gate)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from app.graph.tools.chat_tools import get_chat_tool_declarations
from app.graph.workflow import compile_breathewise_graph
from app.providers.gemini_provider import GeminiStructuredProvider, clear_shared_genai_clients
from app.repositories.family_repo import FamilyAggregate
from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import (
    AirQualityResponse,
    CurrentAirQuality,
    ForecastPoint,
    PollutantReading,
    WeatherSnapshot,
)
from app.schemas.profile import (
    ExercisePreferences,
    FamilyMember,
    IndoorEquipment,
    MemberSchedule,
    OptionalHealthProfile,
    TransportationHabits,
)


def _sample_family_repo() -> Any:
    class StubFamilyRepo:
        def get_family_for_user(
            self, *, uid: str, family_id: str | None = None
        ) -> FamilyAggregate:
            return FamilyAggregate(
                family_id="fam_1",
                owner_user_id=uid,
                household_name="Test Home",
                location_label="Jhumri Telaiya",
                transportation=TransportationHabits(primary_mode="two_wheeler", daily_commute_km=12.0),
                exercise=ExercisePreferences(prefers_outdoor=True, preferred_window="morning"),
                indoor_equipment=IndoorEquipment(has_hepa_purifier=False, has_kitchen_exhaust=False),
                members=[
                    FamilyMember(
                        member_id="m1",
                        nickname="Papa",
                        role="elderly",
                        age_group="60_plus",
                        commute_mode="walk_cycle",
                        schedule=MemberSchedule(outdoor_play_or_exercise_time="07:00"),
                        optional_health_profile=OptionalHealthProfile(
                            has_respiratory_sensitivity=True,
                            notes="Secret note must never appear",
                        ),
                    ),
                    FamilyMember(
                        member_id="m2",
                        nickname="Munna",
                        role="child_toddler",
                        age_group="0_5",
                    ),
                ],
            )

    return StubFamilyRepo()


def _sample_aq_service(aqi: int = 129) -> Any:
    class StubAqService:
        def get_air_quality(self, **_kwargs: Any) -> AirQualityResponse:
            return AirQualityResponse(
                location_id="jhumri",
                location_name="Jhumri Telaiya",
                current=CurrentAirQuality(
                    aqi=aqi,
                    category=AqiCategory.MODERATE if aqi <= 200 else AqiCategory.SEVERE,
                    dominant_pollutant="PM2.5",
                    health_guidance="Moderate.",
                    readings=[
                        PollutantReading(
                            location="Jhumri Telaiya",
                            pollutant="PM2.5",
                            value=68.0,
                            unit="µg/m³",
                            observed_at="2026-11-27T08:00:00Z",
                            source="WAQI",
                            freshness_status=FreshnessStatus.FRESH,
                        )
                    ],
                    observed_at="2026-11-27T08:00:00Z",
                    source="WAQI",
                    freshness_status=FreshnessStatus.FRESH,
                ),
                weather=WeatherSnapshot(
                    temp_c=16.0,
                    humidity_pct=74.0,
                    wind_speed_kmh=6.5,
                    source="Open-Meteo",
                    freshness_status=FreshnessStatus.FRESH,
                ),
                forecasts=[
                    ForecastPoint(
                        forecast_for="2026-11-27T07:00:00Z",
                        estimated_naqi=168,
                        source="Open-Meteo",
                    ),
                    ForecastPoint(
                        forecast_for="2026-11-27T14:00:00Z",
                        estimated_naqi=112,
                        source="Open-Meteo",
                    ),
                ],
            )

    return StubAqService()


def test_chat_tool_declarations_cover_all_seven_on_demand_tools() -> None:
    declarations = get_chat_tool_declarations()
    names = {d.name for d in declarations}
    assert names == {
        "get_city_air_and_pollutants",
        "get_hourly_forecast_windows",
        "get_family_member_schedules",
        "get_home_indoor_playbooks",
        "get_commute_exposure_and_co2",
        "get_my_impact_history",
        "search_verified_guidance",
    }


def test_dynamic_tool_calling_chat_pulls_only_requested_tools_and_keeps_pii_out(
    monkeypatch: Any,
) -> None:
    clear_shared_genai_clients()
    recorded_calls: list[dict[str, Any]] = []
    impact_calls = {"count": 0}

    class SpyImpactService:
        def get_summary(self, *, user_id: str, days: int = 14) -> dict[str, Any]:
            impact_calls["count"] += 1
            return {
                "windowDays": days,
                "emissions": {"totalEstimatedCo2AvoidedKg": 4.2, "actionCount": 2, "isEstimate": True},
                "exposure": {"totalProtectiveActions": 3, "totalProtectedMinutes": 90},
                "dailySeries": [],
                "recentLogs": [],
            }

    class FakeModels:
        def generate_content(self, *, model: str, contents: Any, config: Any) -> Any:
            recorded_calls.append({"contents": contents, "config": config})
            # Call 1 (Phase 1 router): Gemini requests ONLY family schedules + hourly forecast
            if getattr(config, "tools", None):
                return SimpleNamespace(
                    function_calls=[
                        SimpleNamespace(name="get_family_member_schedules", args={}),
                        SimpleNamespace(name="get_hourly_forecast_windows", args={}),
                    ],
                    text="",
                    usage_metadata=SimpleNamespace(prompt_token_count=200, candidates_token_count=30),
                )
            # Call 2 (Phase 2 synthesis): Returns focused father-specific reply
            return SimpleNamespace(
                function_calls=[],
                text=(
                    '{"content":"For your father (older adult 60+ with respiratory sensitivity):\\n'
                    '1. **Shift his 7:00 AM walk** — forecast peaks around 7:00 AM (~AQI 168); '
                    'aim for light indoor stretching or a brief shaded walk near 2:00 PM (~AQI 112).\\n'
                    '2. **Mask near traffic** — use a snug N95 if walking along busy roads.",'
                    '"followUpSuggestions":["Safe indoor stretching ideas for seniors","Does he need an N95 indoors?"]}'
                ),
                usage_metadata=SimpleNamespace(prompt_token_count=320, candidates_token_count=95),
            )

    class FakeClient:
        def __init__(self, **_kwargs: Any) -> None:
            self.models = FakeModels()

    monkeypatch.setattr("app.providers.gemini_provider.genai.Client", FakeClient)

    graph = compile_breathewise_graph(
        family_repo=_sample_family_repo(),
        air_quality_service=_sample_aq_service(129),
        impact_service=SpyImpactService(),  # type: ignore[arg-type]
        llm_provider=GeminiStructuredProvider(api_key="test-key"),
    )

    result = graph.invoke(
        {
            "workflow_mode": "chat",
            "user_id": "u1",
            "location_id": "jhumri",
            "lat": 24.43,
            "lng": 85.53,
            "location_label": "Jhumri Telaiya",
            "user_query": "tell me specific task for my father here",
            "chat_history": [
                {"role": "user", "content": "check what can i do for my family"},
                {"role": "assistant", "content": "In Jhumri Telaiya (AQI 129)..."},
            ],
            "retry_count": 0,
        }
    )

    assert result["fallback_mode"] is False
    # Exactly 2 Gemini calls: Phase 1 router + Phase 2 structured synthesis
    assert len(recorded_calls) == 2
    # Native multi-turn history passed (user + model + current user)
    synth_contents = recorded_calls[1]["contents"]
    assert [c.role for c in synth_contents] == ["user", "model", "user"]
    # Only requested tools appeared in PULLED_TOOL_RESULTS — NO indoor cooking/mopping playbooks or impact DB read!
    final_user_text = synth_contents[-1].parts[0].text
    assert "get_family_member_schedules" in final_user_text
    assert "get_hourly_forecast_windows" in final_user_text
    assert "get_home_indoor_playbooks" not in final_user_text
    assert "Papa" not in final_user_text
    assert "Secret note" not in final_user_text
    assert impact_calls["count"] == 0
    # Agent trace reports exact AI-chosen tools
    trace_str = " | ".join(result["agent_trace"])
    assert "AI selected 2 tools" in trace_str
    assert "Family Member Schedules" in trace_str
    assert "Hourly Forecast Windows" in trace_str
    clear_shared_genai_clients()


def test_dynamic_tool_calling_chat_still_enforces_node7_safety_gate(monkeypatch: Any) -> None:
    clear_shared_genai_clients()

    class FakeModels:
        def generate_content(self, *, model: str, contents: Any, config: Any) -> Any:
            if getattr(config, "tools", None):
                return SimpleNamespace(function_calls=[], text="READY", usage_metadata=None)
            # Hallucinated AQI 42 + recommends jogging during Severe AQI 430 -> Node 7 MUST block!
            return SimpleNamespace(
                function_calls=[],
                text='{"content":"AQI is 42 today, go for a jog outdoors!","followUpSuggestions":["More tips"]}',
                usage_metadata=None,
            )

    class FakeClient:
        def __init__(self, **_kwargs: Any) -> None:
            self.models = FakeModels()

    monkeypatch.setattr("app.providers.gemini_provider.genai.Client", FakeClient)

    graph = compile_breathewise_graph(
        family_repo=_sample_family_repo(),
        air_quality_service=_sample_aq_service(430),
        llm_provider=GeminiStructuredProvider(api_key="test-key"),
    )

    result = graph.invoke(
        {
            "workflow_mode": "chat",
            "user_id": "u1",
            "location_id": "jhumri",
            "lat": 24.43,
            "lng": 85.53,
            "location_label": "Jhumri Telaiya",
            "user_query": "Can I go for a morning run?",
            "retry_count": 0,
        }
    )

    # Node 7 must catch fabricated AQI 42 + unsafe jog + missing medical escalation and emit safe fallback
    assert result["fallback_mode"] is True
    assert len(result["validation_errors"]) >= 1
    assert "medical" in result["final_output"]["content"].lower()
    clear_shared_genai_clients()
