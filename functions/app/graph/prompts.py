"""Grounded prompt builders for Node 4 (recommendation_agent).

Always injects IMMUTABLE DETERMINISTIC CONSTRAINTS, retrieved verified KB chunks,
and strict anti-hallucination instructions.
"""

from __future__ import annotations

import json

from app.rag.seed_data import KnowledgeDocument
from app.schemas.environment import AirQualityResponse
from app.schemas.planner import IndoorQuestionnaire, RiskAssessmentResult
from app.schemas.profile import SanitizedContext

_SYSTEM_BASE = """You are BreatheWise AI, a personal clean-air environmental decision-support assistant.

MANDATORY SAFETY & GROUNDING RULES (NEVER VIOLATE):
1. OBEY ALL DETERMINISTIC CONSTRAINTS provided under `IMMUTABLE_RISK_CONSTRAINTS`. Never override or contradict them.
2. NEVER invent AQI, PM2.5, PM10, temperature, humidity, or wind numbers. Cite ONLY values present in `ENVIRONMENTAL_DATA`. If data is `unavailable`, explicitly state it is unavailable.
3. NEVER fabricate "safe outdoor time windows" (e.g., "safe between 2-4 PM") unless `allowSpecificSafeWindowClaims` is true AND you cite an exact timestamp from `safeForecastWindows`.
4. NEVER diagnose diseases, prescribe medications/inhaler dosages, or replace professional medical advice.
5. If `medicalEscalationRequired` is true, explicitly advise seeking qualified medical care or local emergency services and following official public-health advisories.
6. Use calm, practical, plain language tailored to the household context. Cite the verified knowledge documents provided.
7. Never claim measured indoor PM2.5 sensor readings — indoor assessments are questionnaire-based estimates only.
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
    validation_errors: list[str] | None = None,
) -> tuple[str, str]:
    system_prompt = (
        f"{_SYSTEM_BASE}\n"
        "WRITING STYLE FOR EVERYDAY PEOPLE (CRITICAL):\n"
        "- Generate a concise, warm, action-first Daily Clean-Air Plan with `morning`, `afternoon`, and `evening` arrays "
        "(EXACTLY 2 high-impact RecommendationItem objects per section — never a wall of text).\n"
        "- `title`: 3 to 7 simple words starting with a clear everyday action verb (e.g., 'Move your morning walk indoors', 'Close windows & turn on HEPA').\n"
        "- `whatToDo`: 1 to 2 short, friendly sentences (max ~24 words) tailored to the family's exact commute, workout type, schedule hints, and home gear. Avoid technical jargon like 'PM2.5 infiltration' here.\n"
        "- `why`: 1 plain-English sentence explaining the real-life impact on breathing, throat, kids, or home air.\n"
        "- `alternative`: 1 concrete, realistic backup option.\n"
        "- `supportingData`: Short grounded evidence string citing actual AQI/profile/KB facts.\n"
        "- Pay extra attention to `currentTimeWindow` in HOUSEHOLD_CONTEXT so the current time slot feels immediately helpful right now."
    )
    payload = {
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
    validation_errors: list[str] | None = None,
) -> tuple[str, str]:
    system_prompt = (
        f"{_SYSTEM_BASE}\n"
        "Evaluate the household's Indoor Air Quality Questionnaire and outdoor AQI. "
        "Keep `assessmentBasis` strictly as `estimated_questionnaire` and never claim sensor-measured indoor PM2.5. "
        "Return prioritized, practical indoor improvements covering cooking ventilation, infiltration, HEPA use, dust, and combustion."
    )
    payload = {
        "INDOOR_QUESTIONNAIRE": questionnaire.model_dump(by_alias=True),
        "HOUSEHOLD_CONTEXT": context.model_dump(by_alias=True),
        "ENVIRONMENTAL_DATA": env.current.model_dump(by_alias=True),
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
    validation_errors: list[str] | None = None,
) -> tuple[str, str]:
    system_prompt = (
        f"{_SYSTEM_BASE}\n"
        "Answer the user's environmental question concisely in plain language, referencing real "
        "local AQI/weather, family context, and verified knowledge documents. Provide 2-3 helpful "
        "`followUpSuggestions`."
    )
    payload = {
        "USER_QUESTION": user_query,
        "RECENT_HISTORY": chat_history[-6:],
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
