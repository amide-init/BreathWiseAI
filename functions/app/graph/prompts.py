"""Grounded, token-efficient prompt builders for Node 6 (`recommendation_agent`).

Injects IMMUTABLE DETERMINISTIC CONSTRAINTS, the Node 4 `AgentReasoningPlan`,
Node 5 `ToolExecutionBundle` (including Impact History, Family Schedule × Forecast,
and City Pollutant & Dispersion outputs), deduplicated live selected-city AQI, and
verified RAG KB chunks using compact JSON serialization to minimize input tokens.
"""

from __future__ import annotations

import json
from typing import Any

from app.rag.seed_data import KnowledgeDocument
from app.schemas.common import FreshnessStatus
from app.schemas.environment import AirQualityResponse
from app.schemas.planner import (
    AgentReasoningPlan,
    IndoorQuestionnaire,
    RiskAssessmentResult,
    ToolExecutionBundle,
)
from app.schemas.profile import SanitizedContext

_SYSTEM_BASE = """You are BreathWiseAI, a realistic, empathetic personal clean-air copilot.

MANDATORY SAFETY & GROUNDING RULES (NEVER VIOLATE):
1. OBEY ALL DETERMINISTIC CONSTRAINTS under `IMMUTABLE_RISK_CONSTRAINTS`. Never override or contradict them.
2. ALWAYS ground your suggestions in the selected city's current AQI & weather from `ENVIRONMENTAL_DATA` (mention the city name and exact live AQI/category when available). NEVER give generic city-less advice.
3. NEVER invent AQI, PM2.5, PM10, temperature, humidity, wind, or CO2 numbers. Cite ONLY values present in `ENVIRONMENTAL_DATA` or `TOOL_EXECUTION_RESULTS`. If data is `unavailable`, state it is unavailable.
4. NEVER fabricate "safe outdoor time windows" unless `allowSpecificSafeWindowClaims` is true AND you cite an exact timestamp from `safeForecastWindows`.
5. NEVER diagnose diseases, prescribe medications/inhaler dosages, or replace professional medical advice.
6. If `medicalEscalationRequired` is true, explicitly advise seeking qualified medical care or local emergency services and following official public-health advisories.
7. Never claim measured indoor PM2.5 sensor readings — indoor assessments are questionnaire-based estimates only.
8. Keep personal exposure reduction and estimated CO2e emissions avoided strictly separate (never combine into one score); label CO2 figures as estimates.

REALISTIC HARM-REDUCTION PHILOSOPHY (CRITICAL):
- Real people cannot always quit habits or buy expensive gear overnight. NEVER sound preachy or judgmental.
- Combine TODAY'S CITY AQI + their family schedules + home setup + impact history (`TOOL_EXECUTION_RESULTS`):
  1. Explain honest health impact (`why`).
  2. Give a practical primary step (`whatToDo`) tailored to what they ACTUALLY own and do.
  3. Fill `ifYouContinue` with concrete minimum-loss steps from `TOOL_EXECUTION_RESULTS.harmReductionPlaybooks`."""


def _strip_empty(value: Any) -> Any:
    """Recursively drop None values and empty collections to minimize prompt token waste."""
    if isinstance(value, dict):
        cleaned = {k: _strip_empty(v) for k, v in value.items() if v is not None}
        return {k: v for k, v in cleaned.items() if v != {} and v != []}
    if isinstance(value, list):
        return [_strip_empty(item) for item in value if item is not None]
    return value


def _compact_json(payload: dict[str, Any]) -> str:
    """Serialize prompt context cleanly without whitespace bloat (~25-35% fewer tokens)."""
    return json.dumps(_strip_empty(payload), separators=(",", ":"), ensure_ascii=False)


def _compact_env_payload(env: AirQualityResponse) -> dict[str, Any]:
    """Deduplicated compact snapshot preserving every required PRD §9 measurement & freshness field."""
    cur = env.current
    measured_readings: dict[str, float] = {}
    unavailable_readings: list[str] = []
    for r in cur.readings:
        if r.value is not None and r.freshness_status != FreshnessStatus.UNAVAILABLE:
            measured_readings[r.pollutant] = round(float(r.value), 1)
        else:
            unavailable_readings.append(r.pollutant)

    weather = env.weather
    compact_weather: dict[str, Any] = {"freshness": weather.freshness_status.value}
    if weather.temp_c is not None:
        compact_weather["tempC"] = round(weather.temp_c, 1)
    if weather.humidity_pct is not None:
        compact_weather["humidityPct"] = round(weather.humidity_pct, 1)
    if weather.wind_speed_kmh is not None:
        compact_weather["windKph"] = round(weather.wind_speed_kmh, 1)

    return {
        "locationName": env.location_name,
        "aqi": cur.aqi,
        "category": cur.category.value,
        "dominantPollutant": cur.dominant_pollutant,
        "freshnessStatus": cur.freshness_status.value,
        "observedAt": cur.observed_at,
        "source": cur.source,
        "readings": measured_readings,
        "unavailablePollutants": unavailable_readings,
        "weather": compact_weather,
        "forecastPointsCount": len(env.forecasts),
    }


def _compact_risk_payload(risk: RiskAssessmentResult) -> dict[str, Any]:
    """Drop redundant UI quickDecisions while preserving every deterministic risk rule & constraint."""
    return {
        "severityTier": risk.severity_tier.value,
        "aqiValue": risk.aqi_value,
        "sensitiveGroupsPresent": risk.sensitive_groups_present,
        "sensitiveGroupReasons": risk.sensitive_group_reasons,
        "constraints": risk.constraints.model_dump(by_alias=True),
        "safeForecastWindows": risk.safe_forecast_windows,
        "summaryGuidance": risk.summary_guidance,
    }


def _compact_tool_bundle(tool_results: ToolExecutionBundle | None) -> dict[str, Any]:
    if tool_results is None:
        return {}
    return _strip_empty(tool_results.model_dump(by_alias=True, exclude_none=True))


def _format_rag_context(docs: list[KnowledgeDocument]) -> str:
    blocks = [f"[{doc.doc_id}] {doc.title} ({doc.source_authority}): {doc.content}" for doc in docs]
    return "\n".join(blocks)


def build_daily_plan_prompts(
    *,
    context: SanitizedContext,
    env: AirQualityResponse,
    risk: RiskAssessmentResult,
    docs: list[KnowledgeDocument],
    reasoning_plan: AgentReasoningPlan | None = None,
    tool_results: ToolExecutionBundle | None = None,
    validation_errors: list[str] | None = None,
) -> tuple[str, str]:
    system_prompt = (
        f"{_SYSTEM_BASE}\n"
        "DAILY PLAN STRUCTURE (CRITICAL):\n"
        "- Generate `morning`, `afternoon`, and `evening` arrays (EXACTLY 2 high-impact RecommendationItem objects per section).\n"
        "- `title`: 3 to 7 simple words starting with a clear action verb.\n"
        "- `whatToDo`: 1 to 2 short, practical sentences (max ~26 words) referencing the selected city's actual air quality, family schedule risks, pollutant mix, and real gear/habits.\n"
        "- `why`: 1 plain-language sentence tying today's city AQI/pollutants + indoor/family context to breathing comfort.\n"
        "- `ifYouContinue`: 1 concrete, non-judgmental lower-loss step if they continue a habit or lack ideal gear.\n"
        "- `alternative`: 1 realistic indoor or low-exposure swap.\n"
        "- `supportingData`: Short grounded evidence citing actual city AQI, tool outputs, and verified KB facts.\n"
        "- Prioritize `currentTimeWindow` in HOUSEHOLD_CONTEXT and reference `familyScheduleRisks` & `impactHistoryAnalysis` when present."
    )
    payload = {
        "AGENT_REASONING_PLAN": reasoning_plan.model_dump(by_alias=True, exclude_none=True)
        if reasoning_plan
        else {},
        "TOOL_EXECUTION_RESULTS": _compact_tool_bundle(tool_results),
        "HOUSEHOLD_CONTEXT": context.model_dump(by_alias=True, exclude_none=True),
        "ENVIRONMENTAL_DATA": _compact_env_payload(env),
        "IMMUTABLE_RISK_CONSTRAINTS": _compact_risk_payload(risk),
    }
    retry_note = ""
    if validation_errors:
        retry_note = (
            "\n\nPREVIOUS OUTPUT FAILED SAFETY VALIDATION — FIX ALL ISSUES:\n- "
            + "\n- ".join(validation_errors)
        )
    user_prompt = (
        f"CONTEXT_JSON:{_compact_json(payload)}\n\n"
        f"VERIFIED_KNOWLEDGE_BASE:\n{_format_rag_context(docs)}{retry_note}"
    )
    return system_prompt, user_prompt


def build_indoor_advisor_prompts(
    *,
    questionnaire: IndoorQuestionnaire,
    context: SanitizedContext,
    env: AirQualityResponse,
    risk: RiskAssessmentResult,
    docs: list[KnowledgeDocument],
    reasoning_plan: AgentReasoningPlan | None = None,
    tool_results: ToolExecutionBundle | None = None,
    validation_errors: list[str] | None = None,
) -> tuple[str, str]:
    system_prompt = (
        f"{_SYSTEM_BASE}\n"
        "INDOOR AIR ADVISOR RULES:\n"
        "- Combine the indoor questionnaire WITH the selected city's LIVE outdoor AQI, pollutant mix (`cityPollutantAnalysis`), saved family members in `HOUSEHOLD_CONTEXT`, and `TOOL_EXECUTION_RESULTS`.\n"
        "- Explicitly tailor recommendations and `targetMembers` to the family members in `HOUSEHOLD_CONTEXT`.\n"
        "- Keep `assessmentBasis` strictly as `estimated_questionnaire` and never claim sensor-measured indoor PM2.5.\n"
        "- Tailor advice to today's city AQI + actual home setup (do NOT suggest running a HEPA purifier if `hasHepaPurifier` is false!).\n"
        "- ALWAYS populate `ifYouContinue` with practical, zero-judgment minimum-loss steps."
    )
    payload = {
        "AGENT_REASONING_PLAN": reasoning_plan.model_dump(by_alias=True, exclude_none=True)
        if reasoning_plan
        else {},
        "TOOL_EXECUTION_RESULTS": _compact_tool_bundle(tool_results),
        "INDOOR_QUESTIONNAIRE": questionnaire.model_dump(by_alias=True, exclude_none=True),
        "HOUSEHOLD_CONTEXT": context.model_dump(by_alias=True, exclude_none=True),
        "ENVIRONMENTAL_DATA": _compact_env_payload(env),
        "IMMUTABLE_RISK_CONSTRAINTS": _compact_risk_payload(risk),
    }
    retry_note = ""
    if validation_errors:
        retry_note = "\n\nFIX VALIDATION VIOLATIONS:\n- " + "\n- ".join(validation_errors)
    user_prompt = (
        f"INPUT_JSON:{_compact_json(payload)}\n\n"
        f"VERIFIED_KNOWLEDGE_BASE:\n{_format_rag_context(docs)}{retry_note}"
    )
    return system_prompt, user_prompt


def build_chat_prompts(
    *,
    user_query: str,
    chat_history: list[dict[str, str]],
    context: SanitizedContext,
    env: AirQualityResponse,
    risk: RiskAssessmentResult,
    docs: list[KnowledgeDocument],
    reasoning_plan: AgentReasoningPlan | None = None,
    tool_results: ToolExecutionBundle | None = None,
    validation_errors: list[str] | None = None,
) -> tuple[str, str]:
    is_follow_up = bool(chat_history)
    turn_rule = (
        "- FOLLOW-UP TURN: `RECENT_HISTORY` already established the city, weather, and household setup. "
        "Do NOT repeat the full city/temperature/humidity/toddler/no-HEPA intro — jump directly into "
        "answering the user's new question, citing AQI or forecast figures only where directly helpful."
        if is_follow_up
        else "- FIRST TURN: Briefly ground your answer in the selected city's live AQI (1 concise opening sentence), then answer directly."
    )
    system_prompt = (
        f"{_SYSTEM_BASE}\n"
        "CHAT RESPONSE RULES:\n"
        f"{turn_rule}\n"
        "- PERSON-SPECIFIC QUESTIONS: When the user asks about a specific family member (e.g., father, mother, elder, toddler, school child), "
        "focus specifically on THAT member's age group, health sensitivity, outdoor/walk/commute timing, and personal protection — "
        "do NOT recycle unrelated cooking/mopping chores unless they explicitly asked about cooking or cleaning.\n"
        "- FORECAST HOURS FOR AIRING OUT: When `forecastWindowAnalysis` has `lowestForecastClock` and `lowestForecastAqi` "
        "(even when `safeWindows` is empty because AQI stays >100), honestly note there is no 'Good/Satisfactory (<100)' window today "
        "AND cite the lowest projected forecast hour vs. peak hour for brief 5–10 min cross-ventilation (never falsely label >100 AQI as 'safe').\n"
        "- FORMATTING: Put every numbered step or bullet on its own new line (`\\n`). Keep answers concise and scannable.\n"
        "- FOLLOW-UP CHIPS: Provide 2–3 fresh `followUpSuggestions` covering NEW angles — NEVER repeat questions or topics already answered in `RECENT_HISTORY`."
    )
    payload = {
        "USER_QUESTION": user_query,
        "IS_FOLLOW_UP_TURN": is_follow_up,
        "RECENT_HISTORY": chat_history[-6:],
        "AGENT_REASONING_PLAN": reasoning_plan.model_dump(by_alias=True, exclude_none=True)
        if reasoning_plan
        else {},
        "TOOL_EXECUTION_RESULTS": _compact_tool_bundle(tool_results),
        "HOUSEHOLD_CONTEXT": context.model_dump(by_alias=True, exclude_none=True),
        "ENVIRONMENTAL_DATA": _compact_env_payload(env),
        "IMMUTABLE_RISK_CONSTRAINTS": _compact_risk_payload(risk),
    }
    retry_note = ""
    if validation_errors:
        retry_note = "\n\nFIX VALIDATION VIOLATIONS:\n- " + "\n- ".join(validation_errors)
    user_prompt = (
        f"INPUT_JSON:{_compact_json(payload)}\n\n"
        f"VERIFIED_KNOWLEDGE_BASE:\n{_format_rag_context(docs)}{retry_note}"
    )
    return system_prompt, user_prompt


def build_chat_agent_system_prompt(
    *,
    context: SanitizedContext,
    env: AirQualityResponse,
    risk: RiskAssessmentResult,
    is_follow_up: bool,
) -> str:
    """Lean conversational system prompt for native Gemini Function Calling Chat."""
    cur = env.current
    if cur.freshness_status == FreshnessStatus.UNAVAILABLE or cur.aqi is None:
        city_anchor = f"{env.location_name}: live AQI unavailable (never invent numbers)"
    else:
        stale_tag = " (stale cache)" if cur.freshness_status == FreshnessStatus.STALE else ""
        city_anchor = (
            f"{env.location_name}: AQI {cur.aqi} ({cur.category.value}){stale_tag}, "
            f"source={cur.source}, observedAt={cur.observed_at or 'unknown'}"
        )

    household_brief = (
        f"{len(context.member_descriptors)} saved member(s): {', '.join(context.member_descriptors)}"
        if context.member_descriptors
        else "No saved family members yet"
    )
    constraints_json = _compact_json(risk.constraints.model_dump(by_alias=True))

    turn_style = (
        "FOLLOW-UP TURN: Prior messages already established the city and basic context. "
        "Do NOT repeat the city/temperature/humidity/household intro — answer the new question directly "
        "and naturally, citing AQI or forecast hours only where directly relevant."
        if is_follow_up
        else "FIRST TURN: Briefly anchor your answer in the city's live AQI (1 concise opening line), then answer directly."
    )

    return (
        "You are BreathWiseAI, a natural, practical, empathetic clean-air copilot.\n\n"
        f"LIVE CITY ANCHOR: {city_anchor}\n"
        f"HOUSEHOLD SUMMARY (PII-free): {household_brief}\n"
        f"IMMUTABLE_RISK_CONSTRAINTS: {constraints_json}\n\n"
        "MANDATORY SAFETY & GROUNDING RULES:\n"
        "1. STRICTLY OBEY `IMMUTABLE_RISK_CONSTRAINTS` (never suggest outdoor jogging/strenuous exercise or child outdoor play when disallowed).\n"
        "2. NEVER invent AQI, PM2.5, PM10, weather, forecast hours, or CO2 numbers — cite ONLY values returned by your tools or `LIVE CITY ANCHOR`.\n"
        "3. NEVER falsely claim a 'safe' outdoor time window unless `allowSpecificSafeWindowClaims` is true. "
        "When AQI stays >100 all day and forecast data exists, honestly say no Good/Satisfactory (<100) window exists and cite the lowest projected hour vs peak hour for brief cross-ventilation.\n"
        "4. NEVER diagnose illnesses or prescribe medications. If `medicalEscalationRequired` is true, clearly advise seeking qualified medical care or local emergency services.\n"
        "5. Never claim sensor-measured indoor PM2.5. Keep estimated CO2e avoided and personal exposure protection strictly separate.\n\n"
        "CONVERSATION & PERSONALIZATION RULES:\n"
        f"- {turn_style}\n"
        "- Sound like a helpful human advisor — vary your phrasing naturally and focus ONLY on what the user asked using `PULLED_TOOL_RESULTS`.\n"
        "- For person-specific questions (father, mother, elder, toddler, school child), give tailored guidance for THAT member's age group, sensitivity, walk/commute schedule, and protection — never dump unrelated cooking/mopping chores.\n"
        "- For realistic habits (smoking, incense/dhoop, scooter commute, no HEPA purifier), be zero-judgment: explain honest risk AND give concrete minimum-loss steps.\n"
        "- Format cleanly with Markdown (`**bold**` key takeaways, each numbered step or bullet on its own new line).\n"
        "- Return 2–3 fresh `followUpSuggestions` exploring NEW angles not already answered earlier in this chat."
    )
