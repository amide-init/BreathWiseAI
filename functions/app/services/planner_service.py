"""Use-case service orchestrating the 5-node LangGraph Daily Plan workflow (FR-06)."""

from __future__ import annotations

from typing import Any

from app.graph.workflow import compile_breathewise_graph
from app.rag.retriever import docs_to_citations
from app.repositories.plan_repo import DailyPlanRepository
from app.utils.datetime_utils import utc_now


class PlannerService:
    """Generates, validates, and persists personalized daily clean-air plans."""

    def __init__(
        self,
        *,
        plan_repo: DailyPlanRepository | None = None,
        graph: Any | None = None,
    ) -> None:
        self._plan_repo = plan_repo or DailyPlanRepository()
        self._graph = graph or compile_breathewise_graph()

    def generate_daily_plan(
        self,
        *,
        user_id: str,
        location_id: str,
        lat: float,
        lng: float,
        location_label: str,
        family_id: str | None = None,
        plan_date: str | None = None,
        force_refresh: bool = False,
        current_time_window: str | None = None,
    ) -> dict[str, Any]:
        target_date = plan_date or utc_now().strftime("%Y-%m-%d")

        if not force_refresh:
            existing = self._plan_repo.get_latest_plan_for_date(
                user_id=user_id,
                plan_date=target_date,
            )
            if existing and existing.get("locationId") == location_id:
                return existing

        result_state = self._graph.invoke(
            {
                "workflow_mode": "daily_plan",
                "user_id": user_id,
                "family_id": family_id,
                "location_id": location_id,
                "lat": lat,
                "lng": lng,
                "location_label": location_label,
                "force_refresh_aqi": force_refresh,
                "current_time_window": current_time_window,
                "retry_count": 0,
            }
        )

        env = result_state["environment_data"]
        risk = result_state["risk_assessment"]
        retrieved_docs = result_state.get("retrieved_docs") or []
        citations = [c.model_dump(by_alias=True) for c in docs_to_citations(retrieved_docs)]

        plan_payload: dict[str, Any] = {
            "familyId": result_state.get("resolved_family_id") or family_id or "",
            "locationId": location_id,
            "locationName": env.location_name,
            "planDate": target_date,
            "environmentalSnapshot": env.current.model_dump(by_alias=True),
            "riskAssessment": risk.model_dump(by_alias=True),
            "sections": result_state["final_output"],
            "completedItemIds": [],
            "fallbackMode": bool(result_state.get("fallback_mode", False)),
            "citations": citations,
            "agentTrace": list(result_state.get("agent_trace") or []),
        }

        return self._plan_repo.save_plan(user_id=user_id, plan_payload=plan_payload)
