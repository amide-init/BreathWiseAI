"""Use-case service for the Indoor Air Quality Advisor (PRD Module 4 / FR-07)."""

from __future__ import annotations

from typing import Any

from app.graph.workflow import compile_breathewise_graph
from app.repositories.family_repo import FamilyRepository
from app.schemas.planner import IndoorQuestionnaire


class IndoorAdvisorService:
    """Runs questionnaire-based estimated indoor air assessments through the 5-node LangGraph."""

    def __init__(
        self,
        *,
        family_repo: FamilyRepository | None = None,
        graph: Any | None = None,
    ) -> None:
        self._family_repo = family_repo or FamilyRepository()
        self._graph = graph or compile_breathewise_graph(family_repo=self._family_repo)

    def assess_indoor_air(
        self,
        *,
        user_id: str,
        location_id: str,
        lat: float,
        lng: float,
        location_label: str,
        questionnaire: IndoorQuestionnaire,
        family_id: str | None = None,
    ) -> dict[str, Any]:
        result_state = self._graph.invoke(
            {
                "workflow_mode": "indoor_advisor",
                "user_id": user_id,
                "family_id": family_id,
                "location_id": location_id,
                "lat": lat,
                "lng": lng,
                "location_label": location_label,
                "indoor_answers": questionnaire,
                "retry_count": 0,
            }
        )

        resolved_family_id = result_state.get("resolved_family_id") or family_id
        saved_to_family = False
        if resolved_family_id:
            saved_to_family = self._family_repo.save_indoor_questionnaire(
                uid=user_id,
                family_id=resolved_family_id,
                questionnaire=questionnaire,
            )

        env = result_state["environment_data"]
        risk = result_state["risk_assessment"]
        assessment = dict(result_state["final_output"])
        # Guarantee honest estimation label even if downstream payload omitted it
        assessment["assessmentBasis"] = "estimated_questionnaire"
        assessment["fallbackMode"] = bool(result_state.get("fallback_mode", False))
        assessment["questionnaire"] = questionnaire.model_dump(by_alias=True)
        assessment["environmentalSnapshot"] = env.current.model_dump(by_alias=True)
        assessment["riskAssessment"] = risk.model_dump(by_alias=True)
        assessment["agentTrace"] = list(
            assessment.get("agentTrace") or result_state.get("agent_trace") or []
        )
        assessment["savedToFamilyId"] = resolved_family_id if saved_to_family else None
        return assessment
