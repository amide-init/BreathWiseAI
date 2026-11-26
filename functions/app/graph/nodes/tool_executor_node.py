"""Node 5: Tool Executor Node — runs bounded deterministic tools chosen by Node 4."""

from __future__ import annotations

from typing import Any

from app.graph.state import BreatheWiseState
from app.graph.tools.domain_tools import (
    analyze_forecast_windows,
    compare_commute_exposure_and_co2,
    estimate_indoor_outdoor_interaction,
    lookup_harm_reduction_playbooks,
)
from app.schemas.planner import ToolExecutionBundle

_TOOL_LABELS = {
    "analyze_forecast_windows": "Forecast Window Analyzer",
    "estimate_indoor_outdoor_interaction": "Indoor × City AQI Risk Estimator",
    "lookup_harm_reduction_playbooks": "Harm-Reduction Playbook Lookup",
    "compare_commute_exposure_and_co2": "Commute Exposure & CO₂ Tool",
}


def tool_executor_node(state: BreatheWiseState) -> dict[str, Any]:
    """Node 5: Execute all deterministic domain tools selected by `planning_reasoning_agent`."""
    plan = state["reasoning_plan"]
    env = state["environment_data"]
    context = state["sanitized_context"]
    risk = state["risk_assessment"]
    questionnaire = state.get("indoor_answers")

    bundle = ToolExecutionBundle()
    executed: list[str] = []

    for tool_name in plan.selected_tools:
        if tool_name == "analyze_forecast_windows":
            bundle.forecast_window_analysis = analyze_forecast_windows(env=env, risk=risk)
            executed.append(tool_name)
        elif tool_name == "estimate_indoor_outdoor_interaction":
            bundle.indoor_outdoor_interaction = estimate_indoor_outdoor_interaction(
                env=env,
                context=context,
                questionnaire=questionnaire,
            )
            executed.append(tool_name)
        elif tool_name == "lookup_harm_reduction_playbooks":
            bundle.harm_reduction_playbooks = lookup_harm_reduction_playbooks(
                env=env,
                context=context,
                questionnaire=questionnaire,
                risk=risk,
            )
            executed.append(tool_name)
        elif tool_name == "compare_commute_exposure_and_co2":
            bundle.commute_analysis = compare_commute_exposure_and_co2(env=env, context=context)
            executed.append(tool_name)

    bundle.tools_executed = executed

    trace = list(state.get("agent_trace") or [])
    if executed:
        pretty_names = [_TOOL_LABELS.get(name, name) for name in executed]
        trace.append(f"Ran {len(executed)} tools: {', '.join(pretty_names)}")

    return {
        "tool_results": bundle,
        "agent_trace": trace,
    }
