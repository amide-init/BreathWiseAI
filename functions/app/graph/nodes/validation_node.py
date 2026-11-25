"""Node 5: Validation Node — deterministic grounding, safety, and contradiction gate.

Enforces PRD §7.4 & `.agents/rules/ai-safety-and-grounding.md`:
- Rejects fabricated AQI numbers absent from retrieved environmental context.
- Rejects fabricated safe outdoor time windows when forecast does not support them.
- Rejects contradictions against deterministic RiskConstraints (e.g. jogging in Severe smog).
- Rejects medical diagnosis / medication dosage prescriptions; enforces medical escalation.
- Retries Node 4 at most once, then falls back cleanly to deterministic safe templates.
"""

from __future__ import annotations

import json
import re
from typing import Any

from app.config.settings import get_settings
from app.graph.fallbacks import (
    build_fallback_chat_reply,
    build_fallback_daily_plan,
    build_fallback_indoor_assessment,
)
from app.graph.state import BreatheWiseState
from app.schemas.chat import ChatReply
from app.schemas.common import FreshnessStatus
from app.schemas.planner import (
    DailyPlanSections,
    IndoorAssessmentResponse,
    IndoorQuestionnaire,
)

# Standard CPCB threshold numbers that legitimately appear in educational prose
_STANDARD_CPCB_THRESHOLDS = frozenset({50, 100, 101, 200, 201, 300, 301, 400, 401, 500})

_AQI_MENTION_RE = re.compile(r"\b(?:naqi|aqi)\s*(?:is|of|at|:|=|~|around)?\s*(\d{1,3})\b", re.I)
_SAFE_WINDOW_RE = re.compile(
    r"\b(?:safe|best\s+time|ideal\s+window|cleaner\s+window).{0,35}\b\d{1,2}\s*(?::\d{2})?\s*(?:am|pm)\b",
    re.I,
)
_MEDICAL_DIAGNOSIS_RE = re.compile(
    r"\b(?:you\s+have\s+asthma|diagnos(?:e|ed|is)\s+(?:with|as)|take\s+\d+\s*(?:puffs?|mg|tablets?)|prescribe\s+)\b",
    re.I,
)
_MEDICAL_ESCALATION_TERMS = (
    "doctor",
    "medical",
    "healthcare",
    "physician",
    "emergency",
    "clinician",
)
_AFFIRMATIVE_OUTDOOR_EXERCISE_RE = re.compile(
    r"\b(?:go\s+for\s+a\s+(?:jog|run)|great\s+(?:day|time)\s+to\s+(?:jog|run)|enjoy\s+outdoor\s+(?:jogging|running|strenuous))\b",
    re.I,
)
_AFFIRMATIVE_CHILD_OUTDOOR_RE = re.compile(
    r"\b(?:let\s+(?:your\s+)?child(?:ren)?\s+play\s+outside|safe\s+for\s+child(?:ren)?\s+to\s+play\s+outdoors?)\b",
    re.I,
)
_MEASURED_INDOOR_SENSOR_RE = re.compile(
    r"\b(?:your\s+measured\s+indoor\s+pm2\.?5\s+is\s+\d+|indoor\s+sensor\s+reads\s+\d+)\b",
    re.I,
)


def validate_draft_output(state: BreatheWiseState) -> list[str]:
    """Run all deterministic safety & grounding checks over Node 4 draft output."""
    draft = state.get("draft_output")
    if not draft:
        return ["Missing draft output from recommendation agent."]

    mode = state["workflow_mode"]
    env = state["environment_data"]
    risk = state["risk_assessment"]
    constraints = risk.constraints
    errors: list[str] = []

    # 1. Strict schema validation
    try:
        if mode == "daily_plan":
            parsed = DailyPlanSections.model_validate(draft)
            if not (parsed.morning and parsed.afternoon and parsed.evening):
                errors.append("Daily plan must contain morning, afternoon, and evening items.")
        elif mode == "indoor_advisor":
            parsed_in = IndoorAssessmentResponse.model_validate(draft)
            if not parsed_in.recommendations:
                errors.append("Indoor advisor must return at least one recommendation.")
        else:
            parsed_chat = ChatReply.model_validate(draft)
            if len(parsed_chat.content.strip()) < 10:
                errors.append("Chat reply content is too short.")
    except Exception as exc:  # noqa: BLE001
        return [f"Schema validation error: {exc}"]

    full_text = json.dumps(draft)

    # 2. Numeric AQI grounding check
    allowed_aqi_values: set[int] = set(_STANDARD_CPCB_THRESHOLDS)
    if env.current.aqi is not None:
        allowed_aqi_values.update({env.current.aqi - 1, env.current.aqi, env.current.aqi + 1})
    for pt in env.forecasts:
        if pt.estimated_naqi is not None:
            allowed_aqi_values.update(
                {pt.estimated_naqi - 1, pt.estimated_naqi, pt.estimated_naqi + 1}
            )

    mentioned_aqis = [int(m) for m in _AQI_MENTION_RE.findall(full_text)]
    if env.current.freshness_status == FreshnessStatus.UNAVAILABLE or env.current.aqi is None:
        ungrounded = [v for v in mentioned_aqis if v not in _STANDARD_CPCB_THRESHOLDS]
        if ungrounded:
            errors.append(
                f"Fabricated AQI numbers {ungrounded} cited while environmental data is unavailable."
            )
    else:
        ungrounded = [v for v in mentioned_aqis if v not in allowed_aqi_values]
        if ungrounded:
            errors.append(
                f"Ungrounded AQI values {ungrounded} not present in retrieved readings/forecasts."
            )

    # 3. Time-window honesty check
    if not constraints.allow_specific_safe_window_claims and _SAFE_WINDOW_RE.search(full_text):
        errors.append(
            "Fabricated specific safe outdoor time window without supporting low-AQI forecast data."
        )

    # 4. Deterministic constraint contradiction checks
    if not constraints.allow_strenuous_outdoor and _AFFIRMATIVE_OUTDOOR_EXERCISE_RE.search(
        full_text
    ):
        errors.append(
            "Contradicts risk constraint: recommended outdoor jogging/running when disallowed."
        )

    if not constraints.allow_child_outdoor_play and _AFFIRMATIVE_CHILD_OUTDOOR_RE.search(full_text):
        errors.append(
            "Contradicts risk constraint: recommended child outdoor play when disallowed."
        )

    # 5. Medical boundary & escalation checks
    if _MEDICAL_DIAGNOSIS_RE.search(full_text):
        errors.append(
            "Violates medical safety boundary: diagnostic or medication dosage claim detected."
        )

    if constraints.medical_escalation_required:
        lowered = full_text.lower()
        if not any(term in lowered for term in _MEDICAL_ESCALATION_TERMS):
            errors.append(
                "Missing mandatory medical care / emergency escalation guidance for severe AQI or acute symptoms."
            )

    # 6. Indoor estimation honesty check
    if mode == "indoor_advisor" and _MEASURED_INDOOR_SENSOR_RE.search(full_text):
        errors.append("Indoor assessment falsely claimed sensor-measured indoor PM2.5.")

    return errors


def _build_deterministic_fallback(state: BreatheWiseState) -> dict[str, Any]:
    mode = state["workflow_mode"]
    context = state["sanitized_context"]
    env = state["environment_data"]
    risk = state["risk_assessment"]
    docs = state.get("retrieved_docs") or []

    if mode == "daily_plan":
        return build_fallback_daily_plan(
            context=context,
            env=env,
            risk=risk,
            retrieved_docs=docs,
        ).model_dump(by_alias=True)
    if mode == "indoor_advisor":
        return build_fallback_indoor_assessment(
            questionnaire=state.get("indoor_answers") or IndoorQuestionnaire(),
            env=env,
            risk=risk,
            retrieved_docs=docs,
        ).model_dump(by_alias=True)
    return build_fallback_chat_reply(
        env=env,
        risk=risk,
        retrieved_docs=docs,
    ).model_dump(by_alias=True)


def validation_node(state: BreatheWiseState) -> dict[str, Any]:
    """Node 5 gate: accept valid LLM output, request bounded retry, or emit safe fallback."""
    max_retries = get_settings().graph_max_validation_retries
    retries_used = int(state.get("retry_count", 0))

    # Immediate safe fallback if LLM failed/timed out or unconfigured
    if state.get("llm_failed"):
        return {
            "validation_errors": ["LLM provider unavailable; served deterministic fallback."],
            "fallback_mode": True,
            "final_output": _build_deterministic_fallback(state),
        }

    errors = validate_draft_output(state)
    if not errors:
        return {
            "validation_errors": [],
            "fallback_mode": False,
            "final_output": state["draft_output"],
        }

    if retries_used < max_retries:
        return {
            "validation_errors": errors,
            "retry_count": retries_used + 1,
            "fallback_mode": False,
        }

    return {
        "validation_errors": errors,
        "fallback_mode": True,
        "final_output": _build_deterministic_fallback(state),
    }
