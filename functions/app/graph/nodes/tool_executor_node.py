"""Node 5: Tool Executor Node — runs bounded deterministic tools chosen by Node 4."""

from __future__ import annotations

import logging
from typing import Any

from app.graph.state import BreatheWiseState
from app.graph.tools.domain_tools import (
    analyze_city_pollutants_and_weather,
    analyze_family_schedule_risks,
    analyze_forecast_windows,
    analyze_my_impact_history,
    compare_commute_exposure_and_co2,
    estimate_indoor_outdoor_interaction,
    lookup_harm_reduction_playbooks,
)
from app.schemas.planner import ToolExecutionBundle
from app.services.impact_service import ImpactService
from app.utils.logger import log_event

_TOOL_LABELS = {
    "analyze_forecast_windows": "Forecast Window Analyzer",
    "estimate_indoor_outdoor_interaction": "Indoor × City AQI Risk Estimator",
    "lookup_harm_reduction_playbooks": "Harm-Reduction Playbook Lookup",
    "compare_commute_exposure_and_co2": "Commute Exposure & CO₂ Tool",
    "analyze_my_impact_history": "My Impact & Streak Analyzer",
    "analyze_family_schedule_risks": "Family Schedule × Forecast Tool",
    "analyze_city_pollutants_and_weather": "City Pollutant & Dispersion Tool",
}


def build_tool_executor_node(*, impact_service: ImpactService | None = None):
    """Create Node 5 (`tool_executor_node`) with injectable lazy `ImpactService`."""
    resolved_impact_service = impact_service

    def _run_tool_executor(state: BreatheWiseState) -> dict[str, Any]:
        plan = state["reasoning_plan"]
        env = state["environment_data"]
        context = state["sanitized_context"]
        risk = state["risk_assessment"]
        questionnaire = state.get("indoor_answers")
        user_id = state.get("user_id")

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
            elif tool_name == "analyze_my_impact_history":
                impact_summary: dict[str, Any] | None = None
                if user_id:
                    try:
                        svc = resolved_impact_service or ImpactService()
                        impact_summary = svc.get_summary(user_id=user_id, days=14)
                    except Exception as exc:  # noqa: BLE001
                        log_event(
                            "impact_tool_read_failed",
                            level=logging.WARNING,
                            error=str(exc),
                        )
                bundle.impact_history_analysis = analyze_my_impact_history(
                    impact_summary=impact_summary,
                    risk=risk,
                )
                executed.append(tool_name)
            elif tool_name == "analyze_family_schedule_risks":
                bundle.family_schedule_risks = analyze_family_schedule_risks(
                    context=context,
                    env=env,
                    risk=risk,
                )
                executed.append(tool_name)
            elif tool_name == "analyze_city_pollutants_and_weather":
                bundle.city_pollutant_analysis = analyze_city_pollutants_and_weather(
                    env=env,
                    risk=risk,
                )
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

    return _run_tool_executor


tool_executor_node = build_tool_executor_node()
