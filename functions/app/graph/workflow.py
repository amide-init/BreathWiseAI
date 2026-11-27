"""7-Node Agentic LangGraph Workflow compilation (Parallel Hydration + 7 Tools + Safety Gate).

Topology:
  START ─┬─> context_agent ──────┐
         └─> environment_agent ──┴─> risk_assessment
             -> planning_reasoning_agent -> tool_executor_node
             -> recommendation_agent -> validation_node
                          ^                   |
                          +--- (retry <= 1) --+
                                              +-> END
"""

from __future__ import annotations

import threading
from typing import Any

from langgraph.graph import END, START, StateGraph

from app.graph.nodes.context_node import build_context_node
from app.graph.nodes.environment_node import build_environment_node
from app.graph.nodes.planning_node import planning_reasoning_node
from app.graph.nodes.recommendation_node import build_recommendation_node
from app.graph.nodes.risk_node import risk_assessment_node
from app.graph.nodes.tool_executor_node import build_tool_executor_node
from app.graph.nodes.validation_node import validation_node
from app.graph.state import BreatheWiseState
from app.providers.base import StructuredLLMProvider
from app.rag.retriever import KnowledgeRetriever
from app.repositories.family_repo import FamilyRepository
from app.services.air_quality_service import AirQualityService
from app.services.impact_service import ImpactService

_DEFAULT_GRAPH_LOCK = threading.Lock()
_DEFAULT_GRAPH: Any | None = None


def _route_after_validation(state: BreatheWiseState) -> str:
    if state.get("final_output") is not None:
        return END
    return "recommendation_agent"


def compile_breathewise_graph(
    *,
    family_repo: FamilyRepository | None = None,
    air_quality_service: AirQualityService | None = None,
    impact_service: ImpactService | None = None,
    llm_provider: StructuredLLMProvider | None = None,
    retriever: KnowledgeRetriever | None = None,
) -> Any:
    """Compile the 7-node LangGraph workflow with injectable dependencies for testability."""
    builder = StateGraph(BreatheWiseState)

    builder.add_node("context_agent", build_context_node(family_repo))
    builder.add_node("environment_agent", build_environment_node(air_quality_service))
    builder.add_node("risk_assessment", risk_assessment_node)
    builder.add_node("planning_reasoning_agent", planning_reasoning_node)
    builder.add_node("tool_executor_node", build_tool_executor_node(impact_service=impact_service))
    builder.add_node(
        "recommendation_agent",
        build_recommendation_node(llm_provider=llm_provider, retriever=retriever),
    )
    builder.add_node("validation_node", validation_node)

    # Parallel fan-out of independent Node 1 (family profile) and Node 2 (city AQI + weather)
    builder.add_edge(START, "context_agent")
    builder.add_edge(START, "environment_agent")
    builder.add_edge("context_agent", "risk_assessment")
    builder.add_edge("environment_agent", "risk_assessment")
    builder.add_edge("risk_assessment", "planning_reasoning_agent")
    builder.add_edge("planning_reasoning_agent", "tool_executor_node")
    builder.add_edge("tool_executor_node", "recommendation_agent")
    builder.add_edge("recommendation_agent", "validation_node")
    builder.add_conditional_edges(
        "validation_node",
        _route_after_validation,
        {
            "recommendation_agent": "recommendation_agent",
            END: END,
        },
    )

    return builder.compile()


def get_default_breathewise_graph() -> Any:
    """Return a cached compiled graph singleton for warm Cloud Run requests."""
    global _DEFAULT_GRAPH
    if _DEFAULT_GRAPH is not None:
        return _DEFAULT_GRAPH
    with _DEFAULT_GRAPH_LOCK:
        if _DEFAULT_GRAPH is None:
            _DEFAULT_GRAPH = compile_breathewise_graph()
        return _DEFAULT_GRAPH


def reset_default_breathewise_graph() -> None:
    """Reset the cached graph singleton (used in test isolation)."""
    global _DEFAULT_GRAPH
    with _DEFAULT_GRAPH_LOCK:
        _DEFAULT_GRAPH = None
