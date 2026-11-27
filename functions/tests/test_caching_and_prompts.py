"""Tests for L1 TTLCache, parallel AQI/LangGraph execution, compact prompts & ThinkingConfig."""

from __future__ import annotations

import json
import time
from typing import Any

from app.domain.risk_engine import assess_risk
from app.graph.prompts import build_chat_prompts, build_daily_plan_prompts
from app.graph.workflow import (
    compile_breathewise_graph,
    get_default_breathewise_graph,
    reset_default_breathewise_graph,
)
from app.providers.gemini_provider import (
    GeminiStructuredProvider,
    clear_shared_genai_clients,
)
from app.rag.seed_data import VERIFIED_KNOWLEDGE_DOCS
from app.schemas.chat import ChatReply
from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import (
    AirQualityResponse,
    CurrentAirQuality,
    ForecastPoint,
    PollutantReading,
    WeatherSnapshot,
)
from app.schemas.impact import ImpactActionType, ImpactDomain, ImpactLogRequest
from app.schemas.planner import IndoorQuestionnaire
from app.schemas.profile import SanitizedContext
from app.services.air_quality_service import AirQualityService
from app.services.impact_service import ImpactService
from app.services.indoor_service import IndoorAdvisorService
from app.utils.ttl_cache import TTLCache, clear_all_l1_caches


def test_ttl_cache_expiry_lru_and_prefix_invalidation() -> None:
    cache: TTLCache[str] = TTLCache(max_size=2, ttl_seconds=0.05)
    cache.set("u1:14", "v1")
    cache.set("u1:30", "v2")
    # Access u1:14 so u1:30 becomes LRU
    assert cache.get("u1:14") == "v1"
    cache.set("u2:14", "v3")
    assert cache.get("u1:30") is None
    assert cache.get("u1:14") == "v1"
    assert cache.get("u2:14") == "v3"

    removed = cache.invalidate_prefix("u1:")
    assert removed == 1
    assert cache.get("u1:14") is None

    time.sleep(0.06)
    assert cache.get("u2:14") is None


def test_air_quality_service_parallel_fetch_and_l1_cache() -> None:
    clear_all_l1_caches()

    class FakeAqiRepo:
        def __init__(self) -> None:
            self.get_calls = 0
            self.save_calls = 0

        def get_cached(self, _location_id: str) -> None:
            self.get_calls += 1
            return None

        def save_cached(self, **_kwargs: Any) -> None:
            self.save_calls += 1

    class SlowPrimaryAqi:
        provider_name = "WAQI"

        def __init__(self) -> None:
            self.calls = 0

        def fetch_current_aqi(self, **_kwargs: Any) -> CurrentAirQuality:
            self.calls += 1
            time.sleep(0.08)
            return CurrentAirQuality(
                aqi=165,
                category=AqiCategory.MODERATE,
                dominant_pollutant="PM2.5",
                health_guidance="Moderate.",
                readings=[
                    PollutantReading(
                        location="Delhi",
                        pollutant="PM2.5",
                        value=80.0,
                        unit="µg/m³",
                        observed_at="2026-11-27T08:00:00Z",
                        source="WAQI",
                        freshness_status=FreshnessStatus.FRESH,
                    )
                ],
                observed_at="2026-11-27T08:00:00Z",
                source="WAQI",
                freshness_status=FreshnessStatus.FRESH,
            )

    class SlowWeather:
        provider_name = "Open-Meteo"

        def __init__(self) -> None:
            self.calls = 0

        def fetch_weather_and_forecasts(
            self, **_kwargs: Any
        ) -> tuple[WeatherSnapshot, list[ForecastPoint]]:
            self.calls += 1
            time.sleep(0.08)
            return (
                WeatherSnapshot(
                    temp_c=22.0,
                    humidity_pct=55.0,
                    wind_speed_kmh=9.0,
                    source="Open-Meteo",
                    freshness_status=FreshnessStatus.FRESH,
                ),
                [],
            )

    repo = FakeAqiRepo()
    primary = SlowPrimaryAqi()
    weather = SlowWeather()
    svc = AirQualityService(
        repository=repo,  # type: ignore[arg-type]
        primary_aqi_provider=primary,
        weather_provider=weather,
        use_l1_cache=True,
    )

    started = time.perf_counter()
    first = svc.get_air_quality(
        location_id="delhi-test", lat=28.6, lng=77.2, location_label="Delhi"
    )
    elapsed = time.perf_counter() - started
    assert first.current.aqi == 165
    # Two 80ms sleeps run in parallel should finish well under sequential 160ms
    assert elapsed < 0.14
    assert repo.get_calls == 1
    assert primary.calls == 1
    assert weather.calls == 1

    # Second call hits L1 cache directly (zero Firestore or provider calls)
    second = svc.get_air_quality(
        location_id="delhi-test", lat=28.6, lng=77.2, location_label="Delhi"
    )
    assert second.current.aqi == 165
    assert repo.get_calls == 1
    assert primary.calls == 1

    # force_refresh bypasses L1 cache
    svc.get_air_quality(
        location_id="delhi-test",
        lat=28.6,
        lng=77.2,
        location_label="Delhi",
        force_refresh=True,
    )
    assert primary.calls == 2
    clear_all_l1_caches()


def test_impact_service_l1_cache_and_write_invalidation() -> None:
    clear_all_l1_caches()

    class FakeImpactRepo:
        def __init__(self) -> None:
            self.list_calls = 0
            self.logs: list[dict[str, Any]] = []

        def list_logs(self, *, user_id: str, start_date: str | None = None) -> list[dict[str, Any]]:
            self.list_calls += 1
            return list(self.logs)

        def save_log(self, *, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
            rec = {**payload, "logId": f"log_{len(self.logs) + 1}", "userId": user_id}
            self.logs.append(rec)
            return rec

        def delete_log(self, *, user_id: str, log_id: str) -> bool:
            self.logs = [row for row in self.logs if row["logId"] != log_id]
            return True

    repo = FakeImpactRepo()
    svc = ImpactService(impact_repo=repo, use_l1_cache=True)  # type: ignore[arg-type]

    svc.get_summary(user_id="u1", days=14)
    svc.get_summary(user_id="u1", days=14)
    assert repo.list_calls == 1  # Second call hit L1 cache

    saved = svc.log_action(
        user_id="u1",
        req=ImpactLogRequest(
            impact_domain=ImpactDomain.EMISSIONS_REDUCTION,
            action_type=ImpactActionType.PUBLIC_TRANSIT,
            distance_km=12.0,
            logged_date="2026-11-27",
        ),
    )
    summary_after_log = svc.get_summary(user_id="u1", days=14)
    assert repo.list_calls == 2  # Cache invalidated on write
    assert summary_after_log["emissions"]["actionCount"] == 1

    svc.delete_action(user_id="u1", log_id=saved["logId"])
    summary_after_delete = svc.get_summary(user_id="u1", days=14)
    assert repo.list_calls == 3  # Cache invalidated on delete
    assert summary_after_delete["emissions"]["actionCount"] == 0
    clear_all_l1_caches()


def test_indoor_service_l1_repeat_cache() -> None:
    clear_all_l1_caches()

    class CountingGraph:
        def __init__(self) -> None:
            self.calls = 0

        def invoke(self, _state: dict[str, Any]) -> dict[str, Any]:
            self.calls += 1
            env = AirQualityResponse(
                location_id="delhi",
                location_name="Delhi",
                current=CurrentAirQuality(
                    aqi=180,
                    category=AqiCategory.MODERATE,
                    health_guidance="Moderate",
                    readings=[],
                    source="WAQI",
                    freshness_status=FreshnessStatus.FRESH,
                ),
                weather=WeatherSnapshot(source="Open-Meteo", freshness_status=FreshnessStatus.FRESH),
            )
            risk = assess_risk(current_aqi=env.current, context=SanitizedContext(), forecasts=[])
            return {
                "resolved_family_id": "fam_1",
                "environment_data": env,
                "risk_assessment": risk,
                "fallback_mode": False,
                "agent_trace": ["Checked live air in Delhi: AQI 180 (Moderate)"],
                "final_output": {
                    "assessmentBasis": "estimated_questionnaire",
                    "estimatedRiskLevel": "elevated",
                    "keyIndoorSources": ["Cooking fumes"],
                    "recommendations": [],
                    "citations": [],
                },
            }

    class StubFamilyRepo:
        def save_indoor_questionnaire(self, **_kwargs: Any) -> bool:
            return True

    graph = CountingGraph()
    svc = IndoorAdvisorService(
        family_repo=StubFamilyRepo(),  # type: ignore[arg-type]
        graph=graph,
        use_l1_cache=True,
    )
    q = IndoorQuestionnaire(has_hepa_purifier=False, indoor_smoking_present=True)

    r1 = svc.assess_indoor_air(
        user_id="u1",
        location_id="delhi",
        lat=28.6,
        lng=77.2,
        location_label="Delhi",
        questionnaire=q,
        family_id="fam_1",
    )
    r2 = svc.assess_indoor_air(
        user_id="u1",
        location_id="delhi",
        lat=28.6,
        lng=77.2,
        location_label="Delhi",
        questionnaire=q,
        family_id="fam_1",
    )
    assert r1["estimatedRiskLevel"] == "elevated"
    assert r2["estimatedRiskLevel"] == "elevated"
    assert graph.calls == 1
    clear_all_l1_caches()


def test_parallel_workflow_routes_impact_tool_lazily_and_reuses_singleton() -> None:
    reset_default_breathewise_graph()
    g1 = get_default_breathewise_graph()
    g2 = get_default_breathewise_graph()
    assert g1 is g2
    reset_default_breathewise_graph()

    class StubFamilyRepo:
        def get_family_for_user(self, *, uid: str, family_id: str | None = None) -> None:
            return None

    class StubAqService:
        def get_air_quality(self, **_kwargs: Any) -> AirQualityResponse:
            return AirQualityResponse(
                location_id="pune",
                location_name="Pune",
                current=CurrentAirQuality(
                    aqi=140,
                    category=AqiCategory.MODERATE,
                    dominant_pollutant="PM2.5",
                    health_guidance="Moderate air.",
                    readings=[
                        PollutantReading(
                            location="Pune",
                            pollutant="PM2.5",
                            value=72.0,
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
                    temp_c=24.0,
                    humidity_pct=50.0,
                    wind_speed_kmh=11.0,
                    source="Open-Meteo",
                    freshness_status=FreshnessStatus.FRESH,
                ),
            )

    class SpyImpactService:
        def __init__(self) -> None:
            self.calls = 0

        def get_summary(self, *, user_id: str, days: int = 14) -> dict[str, Any]:
            self.calls += 1
            return {
                "windowDays": days,
                "emissions": {"totalEstimatedCo2AvoidedKg": 5.0, "actionCount": 2, "isEstimate": True},
                "exposure": {"totalProtectiveActions": 1, "totalProtectedMinutes": 45},
                "dailySeries": [{"date": "2026-11-27", "estimatedCo2Kg": 2.5, "exposureActions": 1}],
                "recentLogs": [{"loggedDate": "2026-11-27"}],
            }

    class StubChatLLM:
        provider_name = "Stub"

        def generate_structured(self, **kwargs: Any) -> ChatReply:
            return ChatReply(
                content=(
                    "In Pune today (AQI 140, Moderate), you have avoided an estimated 5.0 kg CO2e "
                    "across 2 swaps and completed 1 protective action."
                ),
                follow_up_suggestions=["Log today's commute swap"],
            )

    spy_impact = SpyImpactService()
    graph = compile_breathewise_graph(
        family_repo=StubFamilyRepo(),  # type: ignore[arg-type]
        air_quality_service=StubAqService(),  # type: ignore[arg-type]
        impact_service=spy_impact,  # type: ignore[arg-type]
        llm_provider=StubChatLLM(),
    )

    # Query NOT mentioning impact should skip ImpactService completely (lazy fetch)
    non_impact_state = graph.invoke(
        {
            "workflow_mode": "chat",
            "user_id": "u1",
            "location_id": "pune",
            "lat": 18.5,
            "lng": 73.8,
            "location_label": "Pune",
            "user_query": "Why is PM2.5 elevated in Pune today?",
            "retry_count": 0,
        }
    )
    assert spy_impact.calls == 0
    assert "analyze_city_pollutants_and_weather" in non_impact_state["tool_results"].tools_executed

    # Query mentioning impact/CO2/streak should invoke ImpactService lazily
    impact_state = graph.invoke(
        {
            "workflow_mode": "chat",
            "user_id": "u1",
            "location_id": "pune",
            "lat": 18.5,
            "lng": 73.8,
            "location_label": "Pune",
            "user_query": "How is my CO2 impact and clean-air streak looking?",
            "retry_count": 0,
        }
    )
    assert spy_impact.calls == 1
    assert "analyze_my_impact_history" in impact_state["tool_results"].tools_executed
    assert impact_state["tool_results"].impact_history_analysis["emissions"][
        "totalEstimatedCo2AvoidedKg"
    ] == 5.0


def test_compact_prompt_reduces_payload_size_while_keeping_safety_fields() -> None:
    env = AirQualityResponse(
        location_id="new-delhi-in",
        location_name="New Delhi",
        current=CurrentAirQuality(
            aqi=260,
            category=AqiCategory.POOR,
            dominant_pollutant="PM2.5",
            health_guidance="Avoid prolonged outdoor exertion.",
            readings=[
                PollutantReading(
                    location="New Delhi",
                    pollutant="PM2.5",
                    value=118.0,
                    unit="µg/m³",
                    observed_at="2026-11-27T08:00:00Z",
                    source="WAQI",
                    freshness_status=FreshnessStatus.FRESH,
                ),
                PollutantReading(
                    location="New Delhi",
                    pollutant="PM10",
                    value=182.0,
                    unit="µg/m³",
                    observed_at="2026-11-27T08:00:00Z",
                    source="WAQI",
                    freshness_status=FreshnessStatus.FRESH,
                ),
            ],
            observed_at="2026-11-27T08:00:00Z",
            source="WAQI",
            freshness_status=FreshnessStatus.FRESH,
        ),
        weather=WeatherSnapshot(
            temp_c=20.0,
            humidity_pct=65.0,
            wind_speed_kmh=5.0,
            observed_at="2026-11-27T08:00:00Z",
            source="Open-Meteo",
            freshness_status=FreshnessStatus.FRESH,
        ),
    )
    ctx = SanitizedContext(profile_complete=True, has_children=True)
    risk = assess_risk(current_aqi=env.current, context=ctx, forecasts=[])
    docs = list(VERIFIED_KNOWLEDGE_DOCS[:3])

    _, compact_prompt = build_daily_plan_prompts(context=ctx, env=env, risk=risk, docs=docs)
    _, chat_prompt = build_chat_prompts(
        user_query="Can my child play outside?",
        chat_history=[],
        context=ctx,
        env=env,
        risk=risk,
        docs=docs[:2],
    )

    # Compare against legacy verbose indent=2 serialization
    legacy_payload = {
        "HOUSEHOLD_CONTEXT": ctx.model_dump(by_alias=True),
        "ENVIRONMENTAL_DATA": {
            "locationName": env.location_name,
            "current": env.current.model_dump(by_alias=True),
            "weather": env.weather.model_dump(by_alias=True),
            "forecastPointsCount": 0,
        },
        "IMMUTABLE_RISK_CONSTRAINTS": risk.model_dump(by_alias=True),
    }
    legacy_json_len = len(json.dumps(legacy_payload, indent=2))
    compact_json_segment = compact_prompt.split("\n\nVERIFIED_KNOWLEDGE_BASE:")[0]
    assert len(compact_json_segment) < legacy_json_len * 0.70

    # Essential grounding & safety fields must remain present
    assert '"observedAt":"2026-11-27T08:00:00Z"' in compact_prompt
    assert '"freshnessStatus":"fresh"' in compact_prompt
    assert '"severityTier":"Poor"' in compact_prompt
    assert '"allowStrenuousOutdoor":false' in compact_prompt
    assert "quickDecisions" not in compact_prompt
    assert "Can my child play outside?" in chat_prompt


def test_gemini_provider_passes_thinking_budget_and_reuses_client(monkeypatch: Any) -> None:
    clear_shared_genai_clients()
    created_clients: list[Any] = []
    captured_configs: list[Any] = []

    class FakeUsage:
        prompt_token_count = 420
        candidates_token_count = 110
        thoughts_token_count = 0
        total_token_count = 530

    class FakeResponse:
        text = '{"content":"Grounded reply in Pune (AQI 140).","followUpSuggestions":["Check forecast"]}'
        usage_metadata = FakeUsage()

    class FakeModels:
        def generate_content(self, *, model: str, contents: str, config: Any) -> FakeResponse:
            captured_configs.append(config)
            return FakeResponse()

    class FakeClient:
        def __init__(self, **_kwargs: Any) -> None:
            self.models = FakeModels()
            created_clients.append(self)

    monkeypatch.setattr("app.providers.gemini_provider.genai.Client", FakeClient)

    provider = GeminiStructuredProvider(api_key="test-key-123")
    res1 = provider.generate_structured(
        system_prompt="sys",
        user_prompt="usr",
        response_schema=ChatReply,
        max_output_tokens=700,
        thinking_budget=0,
        operation_name="chat",
    )
    res2 = provider.generate_structured(
        system_prompt="sys",
        user_prompt="usr",
        response_schema=ChatReply,
        max_output_tokens=700,
        thinking_budget=0,
        operation_name="chat",
    )
    assert res1.content.startswith("Grounded reply")
    assert res2.content.startswith("Grounded reply")
    # Shared genai.Client reused across warm calls
    assert len(created_clients) == 1
    assert captured_configs[0].max_output_tokens == 700
    assert captured_configs[0].thinking_config.thinking_budget == 0
    clear_shared_genai_clients()


def test_followup_chat_for_father_avoids_indoor_chore_flood_and_keeps_pii_free_descriptors() -> None:
    from app.graph.nodes.context_node import sanitize_family_aggregate
    from app.graph.nodes.planning_node import planning_reasoning_node
    from app.repositories.family_repo import FamilyAggregate
    from app.schemas.profile import (
        ExercisePreferences,
        FamilyMember,
        IndoorEquipment,
        MemberSchedule,
        OptionalHealthProfile,
        TransportationHabits,
    )

    family = FamilyAggregate(
        family_id="fam_1",
        owner_user_id="u1",
        household_name="Sharma Home",
        location_label="Jhumri Telaiya",
        transportation=TransportationHabits(primary_mode="two_wheeler", daily_commute_km=10.0),
        exercise=ExercisePreferences(prefers_outdoor=True, preferred_window="morning"),
        indoor_equipment=IndoorEquipment(has_hepa_purifier=False, has_kitchen_exhaust=False),
        members=[
            FamilyMember(
                member_id="m1",
                nickname="Ramesh",
                role="elderly",
                age_group="60_plus",
                commute_mode="walk_cycle",
                schedule=MemberSchedule(outdoor_play_or_exercise_time="07:00"),
                optional_health_profile=OptionalHealthProfile(
                    has_respiratory_sensitivity=True,
                    notes="Private inhaler note that must never appear",
                ),
            ),
            FamilyMember(
                member_id="m2",
                nickname="Aarav",
                role="child_toddler",
                age_group="0_5",
            ),
        ],
    )
    ctx = sanitize_family_aggregate(family, fallback_location_label="Jhumri Telaiya")
    # PII-free descriptors carry sensitivity & commute without leaking names or notes
    joined = " ".join(ctx.member_descriptors)
    assert "respiratory sensitivity" in joined
    assert "commute: walk_cycle" in joined
    assert "Ramesh" not in joined
    assert "inhaler" not in joined
    assert any("outdoor ~07:00" in hint for hint in ctx.member_schedule_hints)

    env = AirQualityResponse(
        location_id="jhumri",
        location_name="Jhumri Telaiya",
        current=CurrentAirQuality(
            aqi=129,
            category=AqiCategory.MODERATE,
            health_guidance="Moderate.",
            readings=[],
            source="WAQI",
            freshness_status=FreshnessStatus.FRESH,
        ),
        weather=WeatherSnapshot(
            temp_c=16.0,
            humidity_pct=74.0,
            wind_speed_kmh=6.0,
            source="Open-Meteo",
            freshness_status=FreshnessStatus.FRESH,
        ),
    )
    risk = assess_risk(current_aqi=env.current, context=ctx, forecasts=[])

    # Follow-up asking about father should route to family schedule + forecast, NOT cooking/no-HEPA chores
    plan_out = planning_reasoning_node(
        {
            "workflow_mode": "chat",
            "sanitized_context": ctx,
            "environment_data": env,
            "risk_assessment": risk,
            "user_query": "tell me specific task for my father here",
            "chat_history": [
                {"role": "user", "content": "check what can i do for my family"},
                {"role": "assistant", "content": "In Jhumri Telaiya, AQI is 129..."},
            ],
        }
    )
    selected = plan_out["reasoning_plan"].selected_tools
    assert "analyze_family_schedule_risks" in selected
    assert "analyze_forecast_windows" in selected
    assert "lookup_harm_reduction_playbooks" not in selected

    sys_prompt, usr_prompt = build_chat_prompts(
        user_query="tell me specific task for my father here",
        chat_history=[
            {"role": "user", "content": "check what can i do for my family"},
            {"role": "assistant", "content": "In Jhumri Telaiya, AQI is 129..."},
        ],
        context=ctx,
        env=env,
        risk=risk,
        docs=list(VERIFIED_KNOWLEDGE_DOCS[:2]),
    )
    assert "FOLLOW-UP TURN" in sys_prompt
    assert "Do NOT repeat" in sys_prompt
    assert '"IS_FOLLOW_UP_TURN":true' in usr_prompt
