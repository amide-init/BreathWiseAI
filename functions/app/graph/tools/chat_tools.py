"""On-demand deterministic Gemini Function Calling tools for personalized Chat (FR-08).

Each tool wraps our verified deterministic domain logic (`domain_tools.py`, `ImpactService`,
and `KnowledgeRetriever`) with strictly PII-free outputs so Gemini 3.5 Flash-Lite pulls ONLY
the data needed for the user's current question instead of receiving a static context dump.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from google.genai import types

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
from app.rag.retriever import KnowledgeRetriever
from app.rag.seed_data import KnowledgeDocument
from app.services.impact_service import ImpactService
from app.utils.logger import log_event

CHAT_TOOL_LABELS: dict[str, str] = {
    "get_city_air_and_pollutants": "City Pollutants & Weather",
    "get_hourly_forecast_windows": "Hourly Forecast Windows",
    "get_family_member_schedules": "Family Member Schedules",
    "get_home_indoor_playbooks": "Home Indoor & Harm-Reduction Playbooks",
    "get_commute_exposure_and_co2": "Commute Exposure & CO₂",
    "get_my_impact_history": "My 14-Day Impact & Streak",
    "search_verified_guidance": "Verified Health Knowledge Base",
}


def get_chat_tool_declarations() -> list[types.FunctionDeclaration]:
    """Return the 7 typed Gemini FunctionDeclarations exposed to the Chat agent."""
    empty_params = {"type": "object", "properties": {}}
    return [
        types.FunctionDeclaration(
            name="get_city_air_and_pollutants",
            description=(
                "Get the selected city's detailed live pollutants (PM2.5, PM10, NO2, O3, etc.), "
                "PM2.5/PM10 fine-smog vs coarse-dust ratio, wind dispersion, humidity haze, and "
                "unavailable sensors. Call when the user asks why air is bad/hazy, about dust vs smog, "
                "weather/wind impact, or pollutant levels."
            ),
            parameters_json_schema=empty_params,
        ),
        types.FunctionDeclaration(
            name="get_hourly_forecast_windows",
            description=(
                "Get the city's real hourly AQI forecast summary including lowest projected hour "
                "vs peak hour and any verified cleaner windows. Call when the user asks about timing: "
                "walking, jogging, kids' play, airing out rooms, opening windows, or later today."
            ),
            parameters_json_schema=empty_params,
        ),
        types.FunctionDeclaration(
            name="get_family_member_schedules",
            description=(
                "Get PII-free household member roles, age groups, per-member respiratory/cardiac "
                "sensitivities, commute modes, and daily school/work/walk times mapped against "
                "hourly forecasts. Call when the user asks about family members (father, mother, "
                "elderly, toddler, kids, spouse) or specific tasks/routines for a person."
            ),
            parameters_json_schema=empty_params,
        ),
        types.FunctionDeclaration(
            name="get_home_indoor_playbooks",
            description=(
                "Get the household's indoor air setup (HEPA purifier, kitchen exhaust, cooking fuel, "
                "smoking, incense/dhoop, sweeping, window sealing) and realistic minimum-loss "
                "harm-reduction steps. Call ONLY when the user asks about indoor air, home fixes, "
                "cooking, smoking, dhoop/incense, dust/cleaning, or purifiers."
            ),
            parameters_json_schema=empty_params,
        ),
        types.FunctionDeclaration(
            name="get_commute_exposure_and_co2",
            description=(
                "Get the user's commute mode, daily distance, roadside exposure tips, and estimated "
                "CO2e savings from lower-emission swaps. Call when the user asks about commuting, "
                "office travel, two-wheeler/car/metro/bus, or travel masks."
            ),
            parameters_json_schema=empty_params,
        ),
        types.FunctionDeclaration(
            name="get_my_impact_history",
            description=(
                "Get the user's logged clean-air history with strictly separated estimated CO2e "
                "emissions avoided and personal exposure-protection actions, streak days, and "
                "easiest next win. Call when the user asks about their impact, CO2 saved, streak, "
                "logged actions, or progress."
            ),
            parameters_json_schema={
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Lookback window in days (7 to 30, default 14).",
                    }
                },
            },
        ),
        types.FunctionDeclaration(
            name="search_verified_guidance",
            description=(
                "Search BreathWiseAI's verified CPCB/WHO/EPA public-health knowledge base for "
                "masks (N95), HEPA filtration, children/elderly precautions, cooking ventilation, "
                "or acute symptom medical escalation."
            ),
            parameters_json_schema={
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": "Short topic phrase to retrieve verified guidance for.",
                    }
                },
                "required": ["topic"],
            },
        ),
    ]


@dataclass
class ChatToolRuntime:
    """Bound per-request deterministic tool handlers and collected RAG citations."""

    declarations: list[types.FunctionDeclaration]
    handlers: dict[str, Callable[[dict[str, Any]], dict[str, Any]]]
    collected_docs: list[KnowledgeDocument] = field(default_factory=list)


def build_chat_tool_runtime(
    *,
    state: BreatheWiseState,
    retriever: KnowledgeRetriever,
    impact_service: ImpactService | None = None,
) -> ChatToolRuntime:
    """Bind the 7 deterministic chat tools to the current turn's verified state."""
    env = state["environment_data"]
    context = state["sanitized_context"]
    risk = state["risk_assessment"]
    questionnaire = state.get("indoor_answers")
    user_id = state.get("user_id")
    collected_docs: list[KnowledgeDocument] = []
    seen_doc_ids: set[str] = set()

    def _get_city_air(_args: dict[str, Any]) -> dict[str, Any]:
        return analyze_city_pollutants_and_weather(env=env, risk=risk)

    def _get_forecast(_args: dict[str, Any]) -> dict[str, Any]:
        return analyze_forecast_windows(env=env, risk=risk)

    def _get_family(_args: dict[str, Any]) -> dict[str, Any]:
        schedule_data = analyze_family_schedule_risks(context=context, env=env, risk=risk)
        return {
            **schedule_data,
            "memberDescriptors": list(context.member_descriptors),
            "primaryCommuteMode": context.primary_commute_mode,
            "dailyCommuteKm": context.daily_commute_km,
        }

    def _get_indoor(_args: dict[str, Any]) -> dict[str, Any]:
        interaction = estimate_indoor_outdoor_interaction(
            env=env,
            context=context,
            questionnaire=questionnaire,
        )
        playbooks = lookup_harm_reduction_playbooks(
            env=env,
            context=context,
            questionnaire=questionnaire,
            risk=risk,
        )
        return {
            "indoorOutdoorInteraction": interaction,
            "harmReductionPlaybooks": playbooks,
        }

    def _get_commute(_args: dict[str, Any]) -> dict[str, Any]:
        return compare_commute_exposure_and_co2(env=env, context=context)

    def _get_impact(args: dict[str, Any]) -> dict[str, Any]:
        raw_days = args.get("days", 14)
        try:
            days = max(7, min(int(raw_days), 30))
        except (TypeError, ValueError):
            days = 14
        summary: dict[str, Any] | None = None
        if user_id:
            try:
                svc = impact_service or ImpactService()
                summary = svc.get_summary(user_id=user_id, days=days)
            except Exception as exc:  # noqa: BLE001
                log_event(
                    "chat_impact_tool_read_failed",
                    level=logging.WARNING,
                    error=str(exc),
                )
        return analyze_my_impact_history(impact_summary=summary, risk=risk)

    def _search_kb(args: dict[str, Any]) -> dict[str, Any]:
        topic = str(args.get("topic") or state.get("user_query") or "").strip()
        docs = retriever.retrieve(
            workflow_mode="chat",
            risk_tier=risk.severity_tier,
            sensitive_groups_present=risk.sensitive_groups_present,
            medical_escalation_required=risk.constraints.medical_escalation_required,
            user_query=topic,
            top_k=3 if risk.constraints.medical_escalation_required else 2,
        )
        for doc in docs:
            if doc.doc_id not in seen_doc_ids:
                seen_doc_ids.add(doc.doc_id)
                collected_docs.append(doc)
        return {
            "documents": [
                {
                    "docId": doc.doc_id,
                    "title": doc.title,
                    "authority": doc.source_authority,
                    "guidance": doc.content,
                }
                for doc in docs
            ]
        }

    return ChatToolRuntime(
        declarations=get_chat_tool_declarations(),
        handlers={
            "get_city_air_and_pollutants": _get_city_air,
            "get_hourly_forecast_windows": _get_forecast,
            "get_family_member_schedules": _get_family,
            "get_home_indoor_playbooks": _get_indoor,
            "get_commute_exposure_and_co2": _get_commute,
            "get_my_impact_history": _get_impact,
            "search_verified_guidance": _search_kb,
        },
        collected_docs=collected_docs,
    )
