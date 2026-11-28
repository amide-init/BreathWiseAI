"""Unit & service-level tests for Phase 4 modules (FR-07 Indoor, FR-08 Chat, FR-09/10 Impact)."""

from __future__ import annotations

from typing import Any

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
from app.services.chat_service import ChatService
from app.services.impact_service import ImpactService
from app.services.indoor_service import IndoorAdvisorService
from app.utils.datetime_utils import utc_now
from tests.test_langgraph_workflow import (
    StubAirQualityService,
    StubFamilyRepo,
    StubKnowledgeRepo,
    StubLLMProvider,
    _sample_env,
    _sample_family,
)


class InMemoryFamilyRepo(StubFamilyRepo):
    def __init__(self, family):
        super().__init__(family)
        self.saved_questionnaires: list[tuple[str, str, IndoorQuestionnaire]] = []

    def save_indoor_questionnaire(
        self, *, uid: str, family_id: str, questionnaire: IndoorQuestionnaire
    ) -> bool:
        self.saved_questionnaires.append((uid, family_id, questionnaire))
        return True


class InMemoryChatRepo:
    def __init__(self) -> None:
        self.sessions: dict[str, dict[str, Any]] = {}
        self.messages: list[dict[str, Any]] = []

    def ensure_session(
        self,
        *,
        user_id: str,
        session_id: str | None,
        family_id: str | None,
        location_id: str,
        first_message: str,
    ) -> str:
        if session_id and session_id in self.sessions:
            return session_id
        sid = session_id or "chat_test_01"
        self.sessions[sid] = {
            "userId": user_id,
            "familyId": family_id,
            "locationId": location_id,
            "title": first_message[:80],
        }
        return sid

    def get_recent_history(
        self, *, user_id: str = "", session_id: str, limit: int = 6
    ) -> list[dict[str, str]]:
        turns = [
            {"role": m["role"], "content": m["content"]}
            for m in self.messages
            if m["sessionId"] == session_id and (not user_id or m["userId"] == user_id)
        ]
        return turns[-limit:]

    def append_message(
        self,
        *,
        session_id: str,
        user_id: str,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        rec = {
            "messageId": f"msg_{len(self.messages) + 1}",
            "sessionId": session_id,
            "userId": user_id,
            "role": role,
            "content": content,
            "createdAt": "2026-11-25T12:00:00Z",
            **(metadata or {}),
        }
        self.messages.append(rec)
        return rec


class InMemoryImpactRepo:
    def __init__(self) -> None:
        self.logs: dict[str, dict[str, Any]] = {}

    def save_log(self, *, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        log_id = f"imp_{len(self.logs) + 1}"
        rec = {
            **payload,
            "logId": log_id,
            "userId": user_id,
            "createdAt": "2026-11-25T12:00:00Z",
        }
        self.logs[log_id] = rec
        return rec

    def list_logs(self, *, user_id: str, start_date: str | None = None) -> list[dict[str, Any]]:
        out = [
            item
            for item in self.logs.values()
            if item["userId"] == user_id
            and (not start_date or str(item.get("loggedDate") or "") >= start_date)
        ]
        out.sort(key=lambda x: str(x.get("loggedDate") or ""), reverse=True)
        return out

    def delete_log(self, *, user_id: str, log_id: str) -> bool:
        item = self.logs.get(log_id)
        if not item or item["userId"] != user_id:
            return False
        del self.logs[log_id]
        return True


def test_indoor_advisor_service_persists_questionnaire_and_labels_estimate() -> None:
    indoor_reply = IndoorAssessmentResponse(
        estimated_risk_level="elevated",
        key_indoor_sources=["Unvented LPG cooking fumes", "Daily incense burning"],
        recommendations=[
            RecommendationItem(
                item_id="in1",
                title="Use kitchen exhaust while cooking",
                priority="high",
                category="cooking_ventilation",
                target_members=["Household"],
                what_to_do="Turn on the kitchen chimney or exhaust fan every time you cook.",
                why="Cooking on LPG without exhaust increases indoor fine particulates when outdoor AQI is 365.",
                alternative="Crack the kitchen window briefly only while simmering and keep bedroom doors closed.",
                supporting_data="Questionnaire (LPG without exhaust) · Outdoor CPCB NAQI 365",
            )
        ],
    )
    family_repo = InMemoryFamilyRepo(_sample_family())
    graph = compile_breathewise_graph(
        family_repo=family_repo,  # type: ignore[arg-type]
        air_quality_service=StubAirQualityService(_sample_env()),  # type: ignore[arg-type]
        llm_provider=StubLLMProvider(responses=[indoor_reply]),
        retriever=KnowledgeRetriever(StubKnowledgeRepo()),  # type: ignore[arg-type]
    )

    service = IndoorAdvisorService(family_repo=family_repo, graph=graph)  # type: ignore[arg-type]
    questionnaire = IndoorQuestionnaire(
        cooking_fuel="lpg_gas",
        uses_kitchen_exhaust=False,
        has_hepa_purifier=True,
        indoor_smoking_present=False,
        incense_or_dhoop_daily=True,
        dust_cleaning_method="dry_broom",
        window_sealing_quality="moderate",
    )
    res = service.assess_indoor_air(
        user_id="uid_1",
        location_id="in-new-delhi-28.61-77.21",
        lat=28.6139,
        lng=77.2090,
        location_label="New Delhi, Delhi, India",
        questionnaire=questionnaire,
    )

    assert res["assessmentBasis"] == "estimated_questionnaire"
    assert res["fallbackMode"] is False
    assert res["savedToFamilyId"] == "fam_01"
    assert len(family_repo.saved_questionnaires) == 1
    assert len(res["recommendations"]) == 1


def test_chat_service_persists_turns_and_attaches_citations() -> None:
    chat_reply = ChatReply(
        content="Current CPCB NAQI in New Delhi is 365 (Very Poor). Keep your school-going child's play indoors today and run your HEPA purifier.",
        follow_up_suggestions=["How should I ventilate during cooking?"],
    )
    chat_repo = InMemoryChatRepo()
    graph = compile_breathewise_graph(
        family_repo=StubFamilyRepo(_sample_family()),  # type: ignore[arg-type]
        air_quality_service=StubAirQualityService(_sample_env()),  # type: ignore[arg-type]
        llm_provider=StubLLMProvider(responses=[chat_reply]),
        retriever=KnowledgeRetriever(StubKnowledgeRepo()),  # type: ignore[arg-type]
    )

    service = ChatService(chat_repo=chat_repo, graph=graph)  # type: ignore[arg-type]
    result = service.send_message(
        user_id="uid_1",
        location_id="in-new-delhi-28.61-77.21",
        lat=28.6139,
        lng=77.2090,
        location_label="New Delhi, Delhi, India",
        message="Can my child play outside today?",
    )

    assert result["sessionId"] == "chat_test_01"
    assert result["reply"]["fallbackMode"] is False
    assert result["reply"]["medicalDisclaimerShown"] is True
    assert len(result["reply"]["citations"]) >= 1
    assert len(chat_repo.messages) == 2
    assert chat_repo.messages[0]["role"] == "user"
    assert chat_repo.messages[1]["role"] == "assistant"


def test_chat_service_triggers_medical_escalation_on_severe_aqi() -> None:
    chat_repo = InMemoryChatRepo()
    graph = compile_breathewise_graph(
        family_repo=StubFamilyRepo(_sample_family()),  # type: ignore[arg-type]
        air_quality_service=StubAirQualityService(
            _sample_env(aqi=430, category=AqiCategory.SEVERE, freshness=FreshnessStatus.FRESH)
        ),  # type: ignore[arg-type]
        llm_provider=StubLLMProvider(fail=True),
        retriever=KnowledgeRetriever(StubKnowledgeRepo()),  # type: ignore[arg-type]
    )

    service = ChatService(chat_repo=chat_repo, graph=graph)  # type: ignore[arg-type]
    result = service.send_message(
        user_id="uid_1",
        location_id="in-new-delhi-28.61-77.21",
        lat=28.6139,
        lng=77.2090,
        location_label="New Delhi, Delhi, India",
        message="Is it safe to go outside?",
    )

    assert result["medicalEscalationRequired"] is True
    assert result["reply"]["fallbackMode"] is True
    assert "medical" in result["reply"]["content"].lower()


def test_impact_service_strictly_separates_emissions_and_exposure() -> None:
    repo = InMemoryImpactRepo()
    service = ImpactService(impact_repo=repo)  # type: ignore[arg-type]
    today = utc_now().date().isoformat()

    emissions_log = service.log_action(
        user_id="uid_1",
        req=ImpactLogRequest(
            action_type=ImpactActionType.CARPOOL,
            impact_domain=ImpactDomain.EMISSIONS_REDUCTION,
            logged_date=today,
            distance_km=20.0,
            baseline_mode="petrol_car_solo",
            occupancy=3,
        ),
    )
    exposure_log = service.log_action(
        user_id="uid_1",
        req=ImpactLogRequest(
            action_type=ImpactActionType.HEPA_PURIFIER_USE,
            impact_domain=ImpactDomain.EXPOSURE_REDUCTION,
            logged_date=today,
            aqi_at_time=340,
            duration_minutes=180,
            activity_replaced="Evening bedroom air filtration",
        ),
    )

    assert emissions_log["estimatedCo2AvoidedKg"] > 0
    assert emissions_log["calculationAssumptions"]["isEstimate"] is True
    assert exposure_log["estimatedCo2AvoidedKg"] is None
    assert exposure_log["exposureContext"]["durationMinutes"] == 180

    summary = service.get_summary(user_id="uid_1", days=14)
    assert summary["emissions"]["actionCount"] == 1
    assert (
        summary["emissions"]["totalEstimatedCo2AvoidedKg"] == emissions_log["estimatedCo2AvoidedKg"]
    )
    assert summary["exposure"]["totalProtectiveActions"] == 1
    assert summary["exposure"]["totalProtectedMinutes"] == 180
    assert len(summary["dailySeries"]) == 14

    deleted = service.delete_action(user_id="uid_1", log_id=emissions_log["logId"])
    assert deleted["deleted"] is True
    after_summary = service.get_summary(user_id="uid_1", days=14)
    assert after_summary["emissions"]["actionCount"] == 0
    assert after_summary["exposure"]["totalProtectiveActions"] == 1
