"""Use-case service for the Indoor Air Quality Advisor (PRD Module 4 / FR-07)."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from app.graph.workflow import compile_breathewise_graph, get_default_breathewise_graph
from app.repositories.family_repo import FamilyRepository
from app.schemas.planner import IndoorQuestionnaire
from app.utils.ttl_cache import INDOOR_L1_CACHE


def _indoor_cache_key(
    *,
    user_id: str,
    location_id: str,
    family_id: str | None,
    questionnaire: IndoorQuestionnaire,
) -> str:
    payload = json.dumps(
        questionnaire.model_dump(by_alias=True),
        sort_keys=True,
        separators=(",", ":"),
    )
    digest = hashlib.sha256(payload.encode()).hexdigest()[:16]
    return f"{user_id}:{location_id}:{family_id or 'default'}:{digest}"


class IndoorAdvisorService:
    """Runs questionnaire-based estimated indoor air assessments through the 7-node LangGraph."""

    def __init__(
        self,
        *,
        family_repo: FamilyRepository | None = None,
        graph: Any | None = None,
        use_l1_cache: bool | None = None,
    ) -> None:
        self._family_repo = family_repo or FamilyRepository()
        if graph is not None:
            self._graph = graph
        elif family_repo is not None:
            self._graph = compile_breathewise_graph(family_repo=family_repo)
        else:
            self._graph = get_default_breathewise_graph()
        self._use_l1_cache = (
            (graph is None and family_repo is None) if use_l1_cache is None else use_l1_cache
        )

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
        cache_key = _indoor_cache_key(
            user_id=user_id,
            location_id=location_id,
            family_id=family_id,
            questionnaire=questionnaire,
        )
        if self._use_l1_cache:
            cached = INDOOR_L1_CACHE.get(cache_key)
            if cached is not None:
                return dict(cached)

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

        if self._use_l1_cache and not assessment["fallbackMode"]:
            INDOOR_L1_CACHE.set(cache_key, dict(assessment))
            if resolved_family_id and resolved_family_id != family_id:
                resolved_key = _indoor_cache_key(
                    user_id=user_id,
                    location_id=location_id,
                    family_id=resolved_family_id,
                    questionnaire=questionnaire,
                )
                INDOOR_L1_CACHE.set(resolved_key, dict(assessment))
        return assessment
