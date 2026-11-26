"""Tests for v2 7-node agentic LangGraph (planning + tools + harm-reduction) & AI household parser."""

from __future__ import annotations

from app.graph.tools.domain_tools import (
    estimate_indoor_outdoor_interaction,
    lookup_harm_reduction_playbooks,
)
from app.graph.workflow import compile_breathewise_graph
from app.repositories.family_repo import FamilyAggregate
from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import AirQualityResponse, CurrentAirQuality, WeatherSnapshot
from app.schemas.planner import IndoorQuestionnaire
from app.schemas.profile import (
    ExercisePreferences,
    FamilyMember,
    IndoorEquipment,
    SanitizedContext,
    TransportationHabits,
)
from app.schemas.profile_ai import ParsedHouseholdDraft, ParsedMemberDraft
from app.services.profile_ai_service import ProfileAiService
from app.utils.errors import UpstreamProviderError


class _StubAirQualityService:
    def __init__(self, env: AirQualityResponse) -> None:
        self._env = env

    def get_air_quality(self, **kwargs: object) -> AirQualityResponse:
        return self._env


class _StubFamilyRepo:
    def get_family_for_user(self, *, uid: str, family_id: str | None = None) -> FamilyAggregate:
        return FamilyAggregate(
            family_id="fam_1",
            owner_user_id=uid,
            household_name="Test Household",
            location_label="New Delhi",
            transportation=TransportationHabits(primary_mode="two_wheeler", daily_commute_km=16.0),
            exercise=ExercisePreferences(prefers_outdoor=True, activity_type="walk"),
            indoor_equipment=IndoorEquipment(
                has_hepa_purifier=False,
                has_kitchen_exhaust=False,
                indoor_smoking_present=True,
            ),
            members=[
                FamilyMember(
                    member_id="m1", nickname="Me", role="working_adult", age_group="18_45"
                ),
                FamilyMember(member_id="m2", nickname="Kid", role="child_school", age_group="6_12"),
            ],
        )


class _FailingLlmProvider:
    def generate_structured(self, **kwargs: object) -> object:
        raise UpstreamProviderError("Google Gemini", "Simulated outage")


class _StubProfileParserLlm:
    def generate_structured(self, **kwargs: object) -> ParsedHouseholdDraft:
        return ParsedHouseholdDraft(
            household_name="Sharma Household",
            city_mentioned="New Delhi",
            primary_commute_mode="two_wheeler",
            daily_commute_km=14.0,
            has_hepa_purifier=False,
            indoor_smoking_present=True,
            incense_or_dhoop_daily=True,
            members=[
                ParsedMemberDraft(nickname="Me", role="working_adult", age_group="18_45"),
                ParsedMemberDraft(
                    nickname="Aarav",
                    role="child_school",
                    age_group="6_12",
                    has_respiratory_sensitivity=True,
                ),
            ],
            summary_note="Understood 2 household members in New Delhi with realistic indoor habits.",
        )


def _sample_poor_aqi_env() -> AirQualityResponse:
    return AirQualityResponse(
        location_id="new-delhi",
        location_name="New Delhi",
        current=CurrentAirQuality(
            aqi=268,
            category=AqiCategory.POOR,
            health_guidance="Limit prolonged outdoor exertion in New Delhi.",
            source="WAQI / CPCB",
            observed_at="2026-11-26T07:00:00Z",
            freshness_status=FreshnessStatus.FRESH,
            readings=[],
        ),
        weather=WeatherSnapshot(
            temp_c=24.0,
            humidity_pct=55.0,
            wind_speed_kmh=6.0,
            source="Open-Meteo",
            freshness_status=FreshnessStatus.FRESH,
        ),
        forecasts=[],
    )


def test_7_node_langgraph_runs_planning_tools_and_harm_reduction_with_city_aqi() -> None:
    env = _sample_poor_aqi_env()
    graph = compile_breathewise_graph(
        family_repo=_StubFamilyRepo(),  # type: ignore[arg-type]
        air_quality_service=_StubAirQualityService(env),  # type: ignore[arg-type]
        llm_provider=_FailingLlmProvider(),  # exercises deterministic harm-reduction fallback
    )

    state = graph.invoke(
        {
            "workflow_mode": "indoor_advisor",
            "user_id": "u1",
            "family_id": "fam_1",
            "location_id": "new-delhi",
            "lat": 28.6139,
            "lng": 77.209,
            "location_label": "New Delhi",
            "indoor_answers": IndoorQuestionnaire(
                indoor_smoking_present=True,
                incense_or_dhoop_daily=True,
                has_hepa_purifier=False,
                uses_kitchen_exhaust=False,
            ),
            "retry_count": 0,
        }
    )

    # Node 4 & Node 5 ran and populated reasoning_plan, tool_results, and agent_trace
    assert "New Delhi: AQI 268 (Poor)" in state["reasoning_plan"].city_aqi_summary
    assert "lookup_harm_reduction_playbooks" in state["tool_results"].tools_executed
    assert len(state["tool_results"].harm_reduction_playbooks) >= 3
    assert any("New Delhi" in step for step in state["agent_trace"])
    assert any("Ran " in step for step in state["agent_trace"])

    # Indoor smoking recommendation MUST include realistic minimum-loss `ifYouContinue` + city AQI
    recs = state["final_output"]["recommendations"]
    smoke_rec = next(r for r in recs if r["itemId"] == "in_smoke")
    assert "New Delhi" in smoke_rec["whatToDo"]
    assert "268" in smoke_rec["whatToDo"]
    assert smoke_rec["ifYouContinue"] is not None
    assert "balcony" in smoke_rec["ifYouContinue"].lower()

    # Saved family members MUST be factored into indoor tool, trace, targets & family sanctuary rec
    interaction = state["tool_results"].indoor_outdoor_interaction
    assert interaction["householdMembersCount"] == 2
    assert "children" in interaction["vulnerableGroups"]
    assert any("2 members" in step for step in state["agent_trace"])
    assert "Children" in smoke_rec["targetMembers"]
    sanctuary_rec = next(r for r in recs if r["itemId"] == "in_family_sanctuary")
    assert "Children" in sanctuary_rec["targetMembers"]


def test_harm_reduction_tools_detect_no_hepa_and_smoking_interaction() -> None:
    env = _sample_poor_aqi_env()
    ctx = SanitizedContext(
        primary_commute_mode="two_wheeler",
        daily_commute_km=12.0,
        indoor_equipment=IndoorEquipment(has_hepa_purifier=False, indoor_smoking_present=True),
    )
    q = IndoorQuestionnaire(indoor_smoking_present=True, has_hepa_purifier=False)
    interaction = estimate_indoor_outdoor_interaction(env=env, context=ctx, questionnaire=q)
    assert interaction["compoundSeverity"] == "high"
    assert interaction["outdoorAqi"] == 268
    assert any("tobacco" in d.lower() for d in interaction["rankedDrivers"])

    from app.domain.risk_engine import assess_risk

    risk = assess_risk(current_aqi=env.current, context=ctx)
    playbooks = lookup_harm_reduction_playbooks(env=env, context=ctx, questionnaire=q, risk=risk)
    habits = {p["habit"] for p in playbooks}
    assert {"indoor_smoking", "no_hepa_purifier", "two_wheeler_commute"}.issubset(habits)


def test_profile_ai_service_parses_structured_and_regex_fallback() -> None:
    svc = ProfileAiService(llm_provider=_StubProfileParserLlm())
    draft = svc.parse_household_description(
        description="Me and my 7yo son Aarav in Delhi, ride scooter 14 km, smoke on balcony, daily dhoop, no purifier"
    )
    assert draft.fallback_used is False
    assert draft.indoor_smoking_present is True
    assert draft.incense_or_dhoop_daily is True
    assert len(draft.members) == 2

    # Fallback when Gemini fails
    fallback_svc = ProfileAiService(llm_provider=_FailingLlmProvider())
    fb = fallback_svc.parse_household_description(
        description="Me, wife, 6yo daughter with asthma, dad 68, ride scooter 18 km, smoking indoors, no purifier"
    )
    assert fb.fallback_used is True
    assert fb.primary_commute_mode == "two_wheeler"
    assert fb.daily_commute_km == 18.0
    assert fb.indoor_smoking_present is True
    assert fb.has_hepa_purifier is False
    assert len(fb.members) >= 4
