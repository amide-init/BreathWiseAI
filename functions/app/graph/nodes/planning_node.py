"""Node 4: Planning & Reasoning Agent — compound risk analysis and dynamic tool selection.

Analyzes the selected city's live AQI, household sensitivities, indoor conditions, and
user query to build an explicit `AgentReasoningPlan` and decide which deterministic
LangGraph tools Node 5 (`tool_executor_node`) should invoke.
"""

from __future__ import annotations

from typing import Any

from app.graph.state import BreatheWiseState
from app.schemas.common import FreshnessStatus
from app.schemas.planner import AgentReasoningPlan


def planning_reasoning_node(state: BreatheWiseState) -> dict[str, Any]:
    """Node 4: Reason over city AQI + indoor/family context and plan tool invocations."""
    mode = state["workflow_mode"]
    context = state["sanitized_context"]
    env = state["environment_data"]
    risk = state["risk_assessment"]
    questionnaire = state.get("indoor_answers")
    user_query = (state.get("user_query") or "").lower()

    city = env.location_name
    cur = env.current
    if cur.freshness_status == FreshnessStatus.UNAVAILABLE or cur.aqi is None:
        city_aqi_summary = f"{city}: live AQI currently unavailable"
        must_cite_aqi = False
    else:
        stale_tag = " (stale cache)" if cur.freshness_status == FreshnessStatus.STALE else ""
        city_aqi_summary = f"{city}: AQI {cur.aqi} ({cur.category.value}){stale_tag}"
        must_cite_aqi = True

    compound_factors: list[str] = [city_aqi_summary]
    personalization_rules: list[str] = [
        f"Ground every suggestion explicitly in {city_aqi_summary} — never give generic city-less advice.",
        "Be empathetic and realistic: never preach 'just stop' or 'buy expensive gear'. "
        "State honest health impact AND fill `ifYouContinue` with concrete minimum-loss steps.",
    ]

    equip = context.indoor_equipment
    smoking = bool(
        questionnaire.indoor_smoking_present
        if questionnaire is not None
        else equip.indoor_smoking_present
    )
    has_hepa = bool(
        questionnaire.has_hepa_purifier if questionnaire is not None else equip.has_hepa_purifier
    )
    incense = bool(questionnaire.incense_or_dhoop_daily if questionnaire is not None else False)
    uses_exhaust = bool(
        questionnaire.uses_kitchen_exhaust
        if questionnaire is not None
        else equip.has_kitchen_exhaust
    )

    if risk.sensitive_groups_present:
        reasons = ", ".join(risk.sensitive_group_reasons) or "sensitive household members"
        compound_factors.append(f"Sensitive group protection active ({reasons})")
        personalization_rules.append(f"Tailor precautions specifically for: {reasons}.")

    if smoking:
        compound_factors.append("Indoor smoking compounds local outdoor PM2.5")
        personalization_rules.append(
            "User has indoor smoking: explain why smoke + outdoor AQI is harmful, AND provide "
            "practical minimum-loss steps in `ifYouContinue` (balcony/outdoors, sealed door, exhaust)."
        )

    if incense:
        compound_factors.append("Daily incense/dhoop adds fine indoor particles")
        personalization_rules.append(
            "User burns daily incense/dhoop: respect routine and offer lower-smoke minimum-loss "
            "steps in `ifYouContinue`."
        )

    if not has_hepa:
        compound_factors.append("No HEPA purifier owned (prioritize zero-cost indoor steps)")
        personalization_rules.append(
            "Household does NOT own a HEPA purifier — never assume they have one; provide "
            "zero-cost sealing, damp mopping, and exhaust timing tactics."
        )

    if not uses_exhaust:
        compound_factors.append("No kitchen exhaust/chimney (cooking fumes need practical venting)")

    # Dynamically select deterministic tools based on workflow mode & context
    selected_tools: list[str] = []
    if mode == "daily_plan":
        selected_tools = [
            "analyze_forecast_windows",
            "estimate_indoor_outdoor_interaction",
            "lookup_harm_reduction_playbooks",
            "compare_commute_exposure_and_co2",
        ]
    elif mode == "indoor_advisor":
        selected_tools = [
            "estimate_indoor_outdoor_interaction",
            "lookup_harm_reduction_playbooks",
            "analyze_forecast_windows",
        ]
    else:  # chat — select tools relevant to the user's question + city AQI
        selected_tools.append("estimate_indoor_outdoor_interaction")
        if any(
            kw in user_query
            for kw in (
                "walk",
                "jog",
                "run",
                "play",
                "outside",
                "window",
                "time",
                "morning",
                "evening",
            )
        ):
            selected_tools.append("analyze_forecast_windows")
        if (
            any(
                kw in user_query
                for kw in (
                    "smoke",
                    "smoking",
                    "cigarette",
                    "dhoop",
                    "incense",
                    "cook",
                    "purifier",
                    "hepa",
                    "indoor",
                    "broom",
                    "dust",
                )
            )
            or smoking
            or incense
            or not has_hepa
        ):
            selected_tools.append("lookup_harm_reduction_playbooks")
        if any(
            kw in user_query
            for kw in (
                "commute",
                "office",
                "car",
                "bike",
                "scooter",
                "metro",
                "bus",
                "drive",
                "travel",
            )
        ):
            selected_tools.append("compare_commute_exposure_and_co2")

    plan = AgentReasoningPlan(
        city_aqi_summary=city_aqi_summary,
        compound_factors=compound_factors,
        selected_tools=selected_tools,
        personalization_rules=personalization_rules,
        must_cite_city_aqi=must_cite_aqi,
    )

    trace = list(state.get("agent_trace") or [])
    trace.append(f"Checked live air in {city_aqi_summary}")
    if len(compound_factors) > 1:
        trace.append(f"Identified household factors: {'; '.join(compound_factors[1:3])}")

    return {
        "reasoning_plan": plan,
        "agent_trace": trace,
    }
