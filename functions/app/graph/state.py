"""Shared LangGraph state contract across all 5 BreatheWise AI nodes (docs/AI_WORKFLOW.md)."""

from __future__ import annotations

from typing import Any, Literal, TypedDict

from app.rag.seed_data import KnowledgeDocument
from app.schemas.environment import AirQualityResponse
from app.schemas.planner import IndoorQuestionnaire, RiskAssessmentResult
from app.schemas.profile import SanitizedContext

WorkflowMode = Literal["daily_plan", "indoor_advisor", "chat"]


class BreatheWiseState(TypedDict, total=False):
    """Typed state flowing through the 5-node LangGraph state machine."""

    # Request inputs
    workflow_mode: WorkflowMode
    user_id: str
    family_id: str | None
    location_id: str
    lat: float
    lng: float
    location_label: str
    force_refresh_aqi: bool
    user_query: str | None
    chat_history: list[dict[str, str]]
    indoor_answers: IndoorQuestionnaire | None

    # Node 1 output (context_agent)
    resolved_family_id: str | None
    sanitized_context: SanitizedContext

    # Node 2 output (environment_agent)
    environment_data: AirQualityResponse

    # Node 3 output (risk_assessment — deterministic only)
    risk_assessment: RiskAssessmentResult

    # Node 4 output (recommendation_agent — RAG + Gemini)
    retrieved_docs: list[KnowledgeDocument]
    draft_output: dict[str, Any] | None
    llm_failed: bool

    # Node 5 output (validation_node)
    validation_errors: list[str]
    retry_count: int
    fallback_mode: bool
    final_output: dict[str, Any]
