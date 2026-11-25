"""End-to-end 5-node LangGraph tests & AI safety red-team verification (PRD §7.4 & §16)."""

from __future__ import annotations

from typing import TypeVar

from pydantic import BaseModel

from app.graph.nodes.context_node import sanitize_family_aggregate
from app.graph.workflow import compile_breathewise_graph
from app.rag.retriever import KnowledgeRetriever
from app.rag.seed_data import VERIFIED_KNOWLEDGE_DOCS
from app.repositories.family_repo import FamilyAggregate
from app.schemas.chat import ChatReply
from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import (
    AirQualityResponse,
    CurrentAirQuality,
    PollutantReading,
    WeatherSnapshot,
)
from app.schemas.planner import DailyPlanSections, RecommendationItem
from app.schemas.profile import (
    ExercisePreferences,
    FamilyMember,
    IndoorEquipment,
    OptionalHealthProfile,
    TransportationHabits,
)
from app.utils.errors import UpstreamProviderError

TModel = TypeVar("TModel", bound=BaseModel)


class StubFamilyRepo:
    def __init__(self, family: FamilyAggregate | None) -> None:
        self._family = family

    def get_family_for_user(
        self, *, uid: str, family_id: str | None = None
    ) -> FamilyAggregate | None:
        return self._family


class StubAirQualityService:
    def __init__(self, response: AirQualityResponse) -> None:
        self._response = response

    def get_air_quality(self, **_kwargs: object) -> AirQualityResponse:
        return self._response


class StubKnowledgeRepo:
    def list_documents(self):
        return list(VERIFIED_KNOWLEDGE_DOCS)


class StubLLMProvider:
    provider_name = "StubGemini"

    def __init__(self, responses: list[BaseModel] | None = None, fail: bool = False) -> None:
        self._responses = list(responses or [])
        self._fail = fail
        self.calls = 0

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_schema: type[TModel],
    ) -> TModel:
        self.calls += 1
        if self._fail:
            raise UpstreamProviderError(self.provider_name, "Simulated Gemini timeout")
        idx = min(self.calls - 1, len(self._responses) - 1)
        return self._responses[idx]  # type: ignore[return-value]


def _sample_family() -> FamilyAggregate:
    return FamilyAggregate(
        family_id="fam_01",
        owner_user_id="uid_1",
        household_name="Sharma Family",
        location_label="New Delhi, Delhi, India",
        transportation=TransportationHabits(primary_mode="personal_car", daily_commute_km=20.0),
        exercise=ExercisePreferences(prefers_outdoor=True, preferred_window="morning"),
        indoor_equipment=IndoorEquipment(has_hepa_purifier=True, purifier_rooms_count=2),
        members=[
            FamilyMember(
                nickname="Aarav Secret Name",
                role="child_school",
                age_group="6_12",
                optional_health_profile=OptionalHealthProfile(
                    has_respiratory_sensitivity=True,
                    notes="Private doctor note should never enter prompt",
                ),
            )
        ],
    )


def _sample_env(
    *,
    aqi: int | None = 365,
    category: AqiCategory = AqiCategory.VERY_POOR,
    freshness: FreshnessStatus = FreshnessStatus.FRESH,
) -> AirQualityResponse:
    return AirQualityResponse(
        location_id="in-new-delhi-28.61-77.21",
        location_name="New Delhi, Delhi, India",
        current=CurrentAirQuality(
            aqi=aqi,
            category=category,
            dominant_pollutant="pm25" if aqi is not None else None,
            health_guidance="Avoid strenuous outdoor exercise.",
            readings=[
                PollutantReading(
                    location="New Delhi, Delhi, India",
                    pollutant="PM2.5",
                    value=185.0 if aqi is not None else None,
                    unit="µg/m³",
                    observed_at="2026-11-25T10:00:00Z" if aqi is not None else None,
                    source="Open-Meteo Air Quality",
                    freshness_status=freshness,
                )
            ],
            observed_at="2026-11-25T10:00:00Z" if aqi is not None else None,
            source="Open-Meteo Air Quality",
            freshness_status=freshness,
        ),
        weather=WeatherSnapshot(
            temp_c=19.0,
            humidity_pct=65.0,
            wind_speed_kmh=6.5,
            source="Open-Meteo",
            freshness_status=freshness,
        ),
        forecasts=[],
    )


def _valid_item(item_id: str, what: str) -> RecommendationItem:
    return RecommendationItem(
        item_id=item_id,
        title="Clean-Air Action",
        priority="high",
        category="indoor_air",
        target_members=["Household"],
        what_to_do=what,
        why="Current CPCB NAQI is 365 (Very Poor), increasing fine particulate inhalation.",
        alternative="Switch to indoor yoga and run your HEPA purifier.",
        supporting_data="CPCB NAQI 365 · Open-Meteo Air Quality",
    )


def test_context_agent_strips_raw_pii_and_health_notes() -> None:
    sanitized = sanitize_family_aggregate(_sample_family())
    dumped = sanitized.model_dump_json()
    assert "Aarav Secret Name" not in dumped
    assert "Private doctor note" not in dumped
    assert sanitized.has_children is True
    assert sanitized.has_respiratory_or_cardiac_sensitivity is True


def test_daily_plan_happy_path_passes_all_5_nodes() -> None:
    good_plan = DailyPlanSections(
        morning=[_valid_item("m1", "Skip outdoor jogging and exercise indoors today.")],
        afternoon=[_valid_item("a1", "Keep school-going child's play indoors with HEPA purifier.")],
        evening=[_valid_item("e1", "Use kitchen exhaust while cooking dinner.")],
    )
    llm = StubLLMProvider(responses=[good_plan])
    graph = compile_breathewise_graph(
        family_repo=StubFamilyRepo(_sample_family()),  # type: ignore[arg-type]
        air_quality_service=StubAirQualityService(_sample_env()),  # type: ignore[arg-type]
        llm_provider=llm,
        retriever=KnowledgeRetriever(StubKnowledgeRepo()),  # type: ignore[arg-type]
    )

    result = graph.invoke(
        {
            "workflow_mode": "daily_plan",
            "user_id": "uid_1",
            "location_id": "in-new-delhi-28.61-77.21",
            "lat": 28.6139,
            "lng": 77.2090,
            "location_label": "New Delhi, Delhi, India",
        }
    )

    assert result["fallback_mode"] is False
    assert result["validation_errors"] == []
    assert llm.calls == 1
    assert len(result["final_output"]["morning"]) == 1


def test_validation_catches_contradictory_jogging_and_fabricated_window_then_falls_back() -> None:
    bad_plan = DailyPlanSections(
        morning=[
            _valid_item(
                "m1",
                "Go for a jog outside! It is safe between 2 PM and 4 PM when AQI is 72.",
            )
        ],
        afternoon=[_valid_item("a1", "Let your child play outside at the park.")],
        evening=[_valid_item("e1", "Keep windows closed.")],
    )
    llm = StubLLMProvider(responses=[bad_plan, bad_plan])
    graph = compile_breathewise_graph(
        family_repo=StubFamilyRepo(_sample_family()),  # type: ignore[arg-type]
        air_quality_service=StubAirQualityService(
            _sample_env(aqi=420, category=AqiCategory.SEVERE)
        ),  # type: ignore[arg-type]
        llm_provider=llm,
        retriever=KnowledgeRetriever(StubKnowledgeRepo()),  # type: ignore[arg-type]
    )

    result = graph.invoke(
        {
            "workflow_mode": "daily_plan",
            "user_id": "uid_1",
            "location_id": "in-new-delhi-28.61-77.21",
            "lat": 28.6139,
            "lng": 77.2090,
            "location_label": "New Delhi, Delhi, India",
        }
    )

    assert llm.calls == 2  # Initial attempt + 1 bounded retry
    assert result["fallback_mode"] is True
    assert len(result["validation_errors"]) >= 2
    # Deterministic fallback replaces unsafe plan cleanly
    final_plan = DailyPlanSections.model_validate(result["final_output"])
    assert len(final_plan.morning) >= 1
    assert any(item.category == "health_precaution" for item in final_plan.evening)


def test_validation_blocks_medical_diagnosis_and_enforces_escalation() -> None:
    unsafe_chat = ChatReply(
        content="You have asthma — take 2 puffs of your inhaler immediately.",
        follow_up_suggestions=[],
    )
    llm = StubLLMProvider(responses=[unsafe_chat, unsafe_chat])
    graph = compile_breathewise_graph(
        family_repo=StubFamilyRepo(_sample_family()),  # type: ignore[arg-type]
        air_quality_service=StubAirQualityService(
            _sample_env(aqi=150, category=AqiCategory.MODERATE)
        ),  # type: ignore[arg-type]
        llm_provider=llm,
        retriever=KnowledgeRetriever(StubKnowledgeRepo()),  # type: ignore[arg-type]
    )

    result = graph.invoke(
        {
            "workflow_mode": "chat",
            "user_id": "uid_1",
            "location_id": "in-new-delhi-28.61-77.21",
            "lat": 28.6139,
            "lng": 77.2090,
            "location_label": "New Delhi, Delhi, India",
            "user_query": "My child is wheezing and coughing, what inhaler dosage?",
        }
    )

    assert result["fallback_mode"] is True
    assert "cannot diagnose" in result["final_output"]["content"].lower()
    assert "medical care" in result["final_output"]["content"].lower()


def test_llm_outage_returns_deterministic_fallback_without_error() -> None:
    graph = compile_breathewise_graph(
        family_repo=StubFamilyRepo(_sample_family()),  # type: ignore[arg-type]
        air_quality_service=StubAirQualityService(
            _sample_env(
                aqi=None, category=AqiCategory.UNAVAILABLE, freshness=FreshnessStatus.UNAVAILABLE
            )
        ),  # type: ignore[arg-type]
        llm_provider=StubLLMProvider(fail=True),
        retriever=KnowledgeRetriever(StubKnowledgeRepo()),  # type: ignore[arg-type]
    )

    result = graph.invoke(
        {
            "workflow_mode": "daily_plan",
            "user_id": "uid_1",
            "location_id": "in-new-delhi-28.61-77.21",
            "lat": 28.6139,
            "lng": 77.2090,
            "location_label": "New Delhi, Delhi, India",
        }
    )

    assert result["fallback_mode"] is True
    plan = DailyPlanSections.model_validate(result["final_output"])
    assert len(plan.morning) >= 1 and len(plan.afternoon) >= 1 and len(plan.evening) >= 1
