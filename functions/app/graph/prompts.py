"""Grounded prompt builders for Node 6 (`recommendation_agent`).

Injects IMMUTABLE DETERMINISTIC CONSTRAINTS, the Node 4 `AgentReasoningPlan`,
Node 5 `ToolExecutionBundle`, live selected-city AQI, and verified RAG KB chunks
with realistic, non-preachy harm-reduction instructions.
"""

from __future__ import annotations

import json

from app.rag.seed_data import KnowledgeDocument
from app.schemas.environment import AirQualityResponse
from app.schemas.planner import (
    AgentReasoningPlan,
    IndoorQuestionnaire,
    RiskAssessmentResult,
    ToolExecutionBundle,
)
from app.schemas.profile import SanitizedContext

_SYSTEM_BASE = """You are BreatheWise AI, a realistic, empathetic personal clean-air copilot.

MANDATORY SAFETY & GROUNDING RULES (NEVER VIOLATE):
1. OBEY ALL DETERMINISTIC CONSTRAINTS provided under `IMMUTABLE_RISK_CONSTRAINTS`. Never override or contradict them.
2. ALWAYS ground your suggestions in the selected city's current AQI & weather from `ENVIRONMENTAL_DATA` (mention the city name and its exact live AQI/category when available). NEVER give generic advice that ignores the city's air quality.
3. NEVER invent AQI, PM2.5, PM10, temperature, humidity, or wind numbers. Cite ONLY values present in `ENVIRONMENTAL_DATA`. If data is `unavailable`, explicitly state it is unavailable.
4. NEVER fabricate "safe outdoor time windows" (e.g., "safe between 2-4 PM") unless `allowSpecificSafeWindowClaims` is true AND you cite an exact timestamp from `safeForecastWindows`.
5. NEVER diagnose diseases, prescribe medications/inhaler dosages, or replace professional medical advice.
6. If `medicalEscalationRequired` is true, explicitly advise seeking qualified medical care or local emergency services and following official public-health advisories.
7. Never claim measured indoor PM2.5 sensor readings — indoor assessments are questionnaire-based estimates only.

REALISTIC HARM-REDUCTION PHILOSOPHY (CRITICAL):
- Real people cannot always follow textbook "ideal" rules overnight (like quitting smoking today, stopping daily puja/dhoop, buying a ₹15,000 HEPA purifier, or ditching a two-wheeler commute).
- NEVER sound preachy or judgmental ("Prohibit all smoking", "Simply buy a HEPA purifier").
- Instead, for every relevant habit or home gap:
  1. Clearly explain the honest health impact (`why`) combining TODAY'S CITY AQI + their indoor setup.
  2. Give a practical primary step (`whatToDo`) tailored to what they ACTUALLY own and do.
  3. Fill `ifYouContinue` with concrete **minimum-loss / lower-damage steps** if they continue the habit or don't have ideal gear (use the `TOOL_EXECUTION_RESULTS.harmReductionPlaybooks` provided!).
"""


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
        "- `whatToDo`: 1 to 2 short, practical sentences (max ~26 words) referencing the selected city's actual air quality AND the household's real gear/habits.\n"
        "- `why`: 1 plain-language sentence tying today's city AQI + their indoor/family context to real breathing comfort.\n"
        "- `ifYouContinue`: 1 concrete, non-judgmental lower-loss step if they still continue a habit (smoking, dhoop, two-wheeler, outdoor errand) or don't own a purifier.\n"
        "- `alternative`: 1 realistic indoor or low-exposure swap.\n"
        "- `supportingData`: Short grounded evidence citing actual city AQI, tool outputs, and verified KB facts.\n"
        "- Prioritize `currentTimeWindow` in HOUSEHOLD_CONTEXT so right-now actions feel immediately useful."
    )
    payload = {
        "AGENT_REASONING_PLAN": reasoning_plan.model_dump(by_alias=True) if reasoning_plan else {},
        "TOOL_EXECUTION_RESULTS": tool_results.model_dump(by_alias=True) if tool_results else {},
        "HOUSEHOLD_CONTEXT": context.model_dump(by_alias=True),
        "ENVIRONMENTAL_DATA": {
            "locationName": env.location_name,
            "current": env.current.model_dump(by_alias=True),
            "weather": env.weather.model_dump(by_alias=True),
            "forecastPointsCount": len(env.forecasts),
        },
        "IMMUTABLE_RISK_CONSTRAINTS": risk.model_dump(by_alias=True),
    }
    retry_note = ""
    if validation_errors:
        retry_note = (
            "\n\nPREVIOUS OUTPUT FAILED SAFETY VALIDATION — FIX ALL ISSUES:\n- "
            + "\n- ".join(validation_errors)
        )
    user_prompt = (
        f"CONTEXT_JSON:\n{json.dumps(payload, indent=2)}\n\n"
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
        "- Combine the household's indoor questionnaire WITH the selected city's LIVE outdoor AQI from `ENVIRONMENTAL_DATA` and `TOOL_EXECUTION_RESULTS`.\n"
        "- Keep `assessmentBasis` strictly as `estimated_questionnaire` and never claim sensor-measured indoor PM2.5.\n"
        "- For EVERY recommendation, explicitly tailor advice to today's city AQI + their actual home setup (do NOT suggest running a HEPA purifier if `hasHepaPurifier` is false!).\n"
        "- ALWAYS populate `ifYouContinue` with practical, zero-judgment minimum-loss steps (e.g., if smoking continues: open balcony with sealed connecting door + exhaust fan; if dhoop continues: 1 short stick near exhaust; if no HEPA: damp towel door-gap seal + wet mopping)."
    )
    payload = {
        "AGENT_REASONING_PLAN": reasoning_plan.model_dump(by_alias=True) if reasoning_plan else {},
        "TOOL_EXECUTION_RESULTS": tool_results.model_dump(by_alias=True) if tool_results else {},
        "INDOOR_QUESTIONNAIRE": questionnaire.model_dump(by_alias=True),
        "HOUSEHOLD_CONTEXT": context.model_dump(by_alias=True),
        "ENVIRONMENTAL_DATA": {
            "locationName": env.location_name,
            "current": env.current.model_dump(by_alias=True),
            "weather": env.weather.model_dump(by_alias=True),
        },
        "IMMUTABLE_RISK_CONSTRAINTS": risk.model_dump(by_alias=True),
    }
    retry_note = ""
    if validation_errors:
        retry_note = "\n\nFIX VALIDATION VIOLATIONS:\n- " + "\n- ".join(validation_errors)
    user_prompt = (
        f"INPUT_JSON:\n{json.dumps(payload, indent=2)}\n\n"
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
    system_prompt = (
        f"{_SYSTEM_BASE}\n"
        "CHAT RESPONSE RULES:\n"
        "- Answer concisely in plain, supportive language, explicitly citing the selected city's live AQI & weather alongside the user's household/indoor context and `TOOL_EXECUTION_RESULTS`.\n"
        "- If the user asks about a realistic habit (smoking, incense, riding a scooter, no purifier, going out anyway), give BOTH the honest health risk AND concrete 'if you still do it, here is how to cut the harm' steps.\n"
        "- Provide 2–3 helpful, context-aware `followUpSuggestions`."
    )
    payload = {
        "USER_QUESTION": user_query,
        "RECENT_HISTORY": chat_history[-6:],
        "AGENT_REASONING_PLAN": reasoning_plan.model_dump(by_alias=True) if reasoning_plan else {},
        "TOOL_EXECUTION_RESULTS": tool_results.model_dump(by_alias=True) if tool_results else {},
        "HOUSEHOLD_CONTEXT": context.model_dump(by_alias=True),
        "ENVIRONMENTAL_DATA": {
            "locationName": env.location_name,
            "current": env.current.model_dump(by_alias=True),
            "weather": env.weather.model_dump(by_alias=True),
        },
        "IMMUTABLE_RISK_CONSTRAINTS": risk.model_dump(by_alias=True),
    }
    retry_note = ""
    if validation_errors:
        retry_note = "\n\nFIX VALIDATION VIOLATIONS:\n- " + "\n- ".join(validation_errors)
    user_prompt = (
        f"INPUT_JSON:\n{json.dumps(payload, indent=2)}\n\n"
        f"VERIFIED_KNOWLEDGE_BASE:\n{_format_rag_context(docs)}{retry_note}"
    )
    return system_prompt, user_prompt
