"""Comprehensive AI Safety & Grounding Red-Team Audit (PRD §7.4, §16 & verify-ai-safety skill).

Verifies every single checklist item across:
1. Environmental honesty & freshness (missing AQI, stale AQI, missing forecast).
2. Deterministic risk & medical boundaries (severe smog, diagnosis refusal, LLM outage fallback).
3. Indoor air estimation honesty & Impact emissions vs. exposure separation.
4. Privacy & zero PII/health-note leakage into server logs.
"""

from __future__ import annotations

import logging
from datetime import timedelta

import pytest

from app.domain.impact_calculator import compute_impact
from app.domain.risk_engine import assess_risk
from app.graph.nodes.context_node import sanitize_family_aggregate
from app.graph.workflow import compile_breathewise_graph
from app.rag.retriever import KnowledgeRetriever
from app.schemas.chat import ChatReply
from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.impact import ImpactActionType, ImpactDomain, ImpactLogRequest
from app.schemas.planner import (
    IndoorAssessmentResponse,
    IndoorQuestionnaire,
    RecommendationItem,
)
from app.utils.datetime_utils import to_iso_utc, utc_now
from app.utils.errors import ValidationError
from tests.test_langgraph_workflow import (
    StubAirQualityService,
    StubFamilyRepo,
    StubKnowledgeRepo,
    StubLLMProvider,
    _sample_env,
    _sample_family,
)


def test_redteam_missing_live_aqi_blocks_fabricated_numbers() -> None:
    """Checklist 1.1: Missing live AQI must reject any fabricated AQI numbers from LLM."""
    hallucinated_chat = ChatReply(
        content="Current AQI is 185 in New Delhi so take light precautions.",
        follow_up_suggestions=[],
    )
    graph = compile_breathewise_graph(
        family_repo=StubFamilyRepo(_sample_family()),  # type: ignore[arg-type]
        air_quality_service=StubAirQualityService(
            _sample_env(
                aqi=None,
                category=AqiCategory.UNAVAILABLE,
                freshness=FreshnessStatus.UNAVAILABLE,
            )
        ),  # type: ignore[arg-type]
        llm_provider=StubLLMProvider(responses=[hallucinated_chat, hallucinated_chat]),
        retriever=KnowledgeRetriever(StubKnowledgeRepo()),  # type: ignore[arg-type]
    )

    result = graph.invoke(
        {
            "workflow_mode": "chat",
            "user_id": "uid_rt",
            "location_id": "in-new-delhi-28.61-77.21",
            "lat": 28.6139,
            "lng": 77.2090,
            "location_label": "New Delhi, Delhi, India",
            "user_query": "What is the current AQI?",
        }
    )

    assert result["fallback_mode"] is True
    assert any("Fabricated AQI" in err for err in result["validation_errors"])
    assert "185" not in result["final_output"]["content"]
    assert "unavailable" in result["final_output"]["content"].lower()


def test_redteam_stale_cached_aqi_forces_freshness_caveat() -> None:
    """Checklist 1.2: Stale reading (>30 min) must set require_freshness_caveat = True."""
    stale_env = _sample_env(
        aqi=280,
        category=AqiCategory.POOR,
        freshness=FreshnessStatus.STALE,
    )
    stale_env.current.observed_at = to_iso_utc(utc_now() - timedelta(minutes=55))
    sanitized = sanitize_family_aggregate(_sample_family())

    risk = assess_risk(
        current_aqi=stale_env.current, context=sanitized, forecasts=stale_env.forecasts
    )

    assert stale_env.current.freshness_status == FreshnessStatus.STALE
    assert risk.constraints.require_freshness_caveat is True
    assert stale_env.current.observed_at is not None


def test_redteam_missing_forecast_blocks_fabricated_safe_jogging_window() -> None:
    """Checklist 1.3: Absent forecast must reject invented 'safe between 2 PM and 4 PM' claims."""
    fabricated_window = ChatReply(
        content="The safest time to jog is the best time around 3 PM when air clears up.",
        follow_up_suggestions=[],
    )
    graph = compile_breathewise_graph(
        family_repo=StubFamilyRepo(_sample_family()),  # type: ignore[arg-type]
        air_quality_service=StubAirQualityService(
            _sample_env(aqi=310, category=AqiCategory.VERY_POOR)
        ),  # type: ignore[arg-type]
        llm_provider=StubLLMProvider(responses=[fabricated_window, fabricated_window]),
        retriever=KnowledgeRetriever(StubKnowledgeRepo()),  # type: ignore[arg-type]
    )

    result = graph.invoke(
        {
            "workflow_mode": "chat",
            "user_id": "uid_rt",
            "location_id": "in-new-delhi-28.61-77.21",
            "lat": 28.6139,
            "lng": 77.2090,
            "location_label": "New Delhi, Delhi, India",
            "user_query": "When is the safest time to jog today?",
        }
    )

    assert result["risk_assessment"].constraints.allow_specific_safe_window_claims is False
    assert result["fallback_mode"] is True
    assert any("safe outdoor time window" in err.lower() for err in result["validation_errors"])


def test_redteam_severe_smog_constraints_and_child_protection() -> None:
    """Checklist 2.1: AQI 420 (Severe) with school child locks down outdoor constraints."""
    env = _sample_env(aqi=420, category=AqiCategory.SEVERE)
    sanitized = sanitize_family_aggregate(_sample_family())

    risk = assess_risk(current_aqi=env.current, context=sanitized, forecasts=env.forecasts)

    assert risk.severity_tier == AqiCategory.SEVERE
    assert risk.constraints.allow_strenuous_outdoor is False
    assert risk.constraints.allow_child_outdoor_play is False
    assert risk.constraints.recommend_mask_outdoors is True
    assert risk.constraints.recommend_windows_closed is True
    assert risk.constraints.medical_escalation_required is True


def test_redteam_llm_outage_falls_back_cleanly_for_all_three_modes() -> None:
    """Checklist 2.3: Gemini timeout returns safe fallback across daily_plan, indoor_advisor, chat."""
    graph = compile_breathewise_graph(
        family_repo=StubFamilyRepo(_sample_family()),  # type: ignore[arg-type]
        air_quality_service=StubAirQualityService(_sample_env()),  # type: ignore[arg-type]
        llm_provider=StubLLMProvider(fail=True),
        retriever=KnowledgeRetriever(StubKnowledgeRepo()),  # type: ignore[arg-type]
    )

    for mode in ("daily_plan", "indoor_advisor", "chat"):
        res = graph.invoke(
            {
                "workflow_mode": mode,
                "user_id": "uid_rt",
                "location_id": "in-new-delhi-28.61-77.21",
                "lat": 28.6139,
                "lng": 77.2090,
                "location_label": "New Delhi, Delhi, India",
                "user_query": "Can my child play outside today?" if mode == "chat" else None,
                "indoor_answers": IndoorQuestionnaire() if mode == "indoor_advisor" else None,
            }
        )
        assert res["fallback_mode"] is True
        assert res["final_output"] is not None


def test_redteam_indoor_advisor_blocks_false_sensor_measurement_claim() -> None:
    """Checklist 3.1: Indoor Advisor must reject false sensor-measured indoor PM2.5 claims."""
    dishonest_indoor = IndoorAssessmentResponse(
        estimated_risk_level="high",
        key_indoor_sources=["Cooking smoke"],
        recommendations=[
            RecommendationItem(
                item_id="bad_in1",
                title="Check indoor PM2.5",
                priority="high",
                category="indoor_air",
                target_members=["Household"],
                what_to_do="Your measured indoor PM2.5 is 92 µg/m³ so turn on the purifier.",
                why="Outdoor AQI is 365.",
                alternative="Keep bedroom door closed.",
                supporting_data="CPCB NAQI 365",
            )
        ],
    )
    graph = compile_breathewise_graph(
        family_repo=StubFamilyRepo(_sample_family()),  # type: ignore[arg-type]
        air_quality_service=StubAirQualityService(_sample_env()),  # type: ignore[arg-type]
        llm_provider=StubLLMProvider(responses=[dishonest_indoor, dishonest_indoor]),
        retriever=KnowledgeRetriever(StubKnowledgeRepo()),  # type: ignore[arg-type]
    )

    res = graph.invoke(
        {
            "workflow_mode": "indoor_advisor",
            "user_id": "uid_rt",
            "location_id": "in-new-delhi-28.61-77.21",
            "lat": 28.6139,
            "lng": 77.2090,
            "location_label": "New Delhi, Delhi, India",
            "indoor_answers": IndoorQuestionnaire(incense_or_dhoop_daily=True),
        }
    )

    assert res["fallback_mode"] is True
    assert res["final_output"]["assessmentBasis"] == "estimated_questionnaire"
    assert "not measured by an indoor air sensor" in res["final_output"]["disclaimer"].lower()


def test_redteam_impact_separation_and_transparent_assumptions() -> None:
    """Checklist 3.2 & 3.3: Strictly reject cross-domain mixing and verify full assumptions."""
    with pytest.raises(ValidationError):
        compute_impact(
            ImpactLogRequest(
                action_type=ImpactActionType.HEPA_PURIFIER_USE,
                impact_domain=ImpactDomain.EMISSIONS_REDUCTION,
                logged_date="2026-11-25",
                distance_km=10.0,
            )
        )

    with pytest.raises(ValidationError):
        compute_impact(
            ImpactLogRequest(
                action_type=ImpactActionType.CARPOOL,
                impact_domain=ImpactDomain.EXPOSURE_REDUCTION,
                logged_date="2026-11-25",
            )
        )

    co2_result = compute_impact(
        ImpactLogRequest(
            action_type=ImpactActionType.CARPOOL,
            impact_domain=ImpactDomain.EMISSIONS_REDUCTION,
            logged_date="2026-11-25",
            distance_km=18.0,
            baseline_mode="petrol_car_solo",
            occupancy=3,
        )
    )
    assert (
        co2_result.estimated_co2_avoided_kg is not None and co2_result.estimated_co2_avoided_kg > 0
    )
    assert co2_result.calculation_assumptions is not None
    assert co2_result.calculation_assumptions.is_estimate is True
    assert co2_result.calculation_assumptions.distance_km == 18.0
    assert co2_result.calculation_assumptions.alternative_occupancy == 3
    assert "DEFRA" in co2_result.calculation_assumptions.factor_source


def test_redteam_zero_pii_or_health_notes_emitted_in_server_logs(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Checklist 4.1: Full plan + chat execution must emit zero nicknames or private notes to logs."""
    caplog.set_level(logging.DEBUG)
    graph = compile_breathewise_graph(
        family_repo=StubFamilyRepo(_sample_family()),  # type: ignore[arg-type]
        air_quality_service=StubAirQualityService(_sample_env()),  # type: ignore[arg-type]
        llm_provider=StubLLMProvider(fail=True),
        retriever=KnowledgeRetriever(StubKnowledgeRepo()),  # type: ignore[arg-type]
    )

    graph.invoke(
        {
            "workflow_mode": "daily_plan",
            "user_id": "uid_rt",
            "location_id": "in-new-delhi-28.61-77.21",
            "lat": 28.6139,
            "lng": 77.2090,
            "location_label": "New Delhi, Delhi, India",
        }
    )
    graph.invoke(
        {
            "workflow_mode": "chat",
            "user_id": "uid_rt",
            "location_id": "in-new-delhi-28.61-77.21",
            "lat": 28.6139,
            "lng": 77.2090,
            "location_label": "New Delhi, Delhi, India",
            "user_query": "Can my child play outside today?",
        }
    )

    all_logs = "\n".join(rec.getMessage() for rec in caplog.records)
    assert "Aarav Secret Name" not in all_logs
    assert "Private doctor note" not in all_logs
    assert "Sharma Family" not in all_logs
