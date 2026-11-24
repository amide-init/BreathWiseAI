"""Node 3 Deterministic Risk Assessment Engine (PRD §7.2 & docs/AI_WORKFLOW.md).

Pure Python rules — ZERO LLM calls. Computes immutable safety constraints that
Node 4 (Gemini) must obey and Node 5 (Validation) enforces.
"""

from __future__ import annotations

from app.config.constants import ACUTE_SYMPTOM_KEYWORDS
from app.domain.aqi_calculator import classify_cpcb_naqi, get_default_health_guidance
from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import CurrentAirQuality, ForecastPoint
from app.schemas.planner import RiskAssessmentResult, RiskConstraints
from app.schemas.profile import SanitizedContext


def detect_medical_escalation_query(user_query: str | None) -> bool:
    """Return True if user message mentions acute symptoms or diagnosis/prescription requests."""
    if not user_query:
        return False
    lowered = user_query.lower()
    return any(keyword in lowered for keyword in ACUTE_SYMPTOM_KEYWORDS)


def extract_safe_forecast_windows(forecasts: list[ForecastPoint]) -> list[str]:
    """Identify future forecast timestamps whose estimated NAQI is <= 100 (Good/Satisfactory)."""
    return [
        point.forecast_for
        for point in forecasts
        if point.estimated_naqi is not None and point.estimated_naqi <= 100
    ]


def assess_risk(
    *,
    current_aqi: CurrentAirQuality,
    context: SanitizedContext,
    forecasts: list[ForecastPoint] | None = None,
    user_query: str | None = None,
) -> RiskAssessmentResult:
    """Deterministically evaluate exposure risk and hard recommendation constraints."""
    category = (
        AqiCategory.UNAVAILABLE
        if current_aqi.freshness_status == FreshnessStatus.UNAVAILABLE or current_aqi.aqi is None
        else classify_cpcb_naqi(current_aqi.aqi)
    )

    sensitive_reasons: list[str] = []
    if context.has_toddlers:
        sensitive_reasons.append("young child (0-5)")
    if context.has_children:
        sensitive_reasons.append("school-age child")
    if context.has_elderly:
        sensitive_reasons.append("older adult (60+)")
    if context.has_respiratory_or_cardiac_sensitivity:
        sensitive_reasons.append("optional respiratory/cardiac sensitivity")
    sensitive_present = bool(sensitive_reasons)

    # Base CPCB NAQI constraint matrix (docs/AI_WORKFLOW.md §3 Node 3)
    if category in (AqiCategory.GOOD, AqiCategory.SATISFACTORY):
        allow_strenuous = True
        allow_child_play = True
        recommend_mask = False
        recommend_windows_closed = False
        recommend_hepa = False
    elif category == AqiCategory.MODERATE:
        allow_strenuous = not sensitive_present
        allow_child_play = True
        recommend_mask = False
        recommend_windows_closed = False
        recommend_hepa = sensitive_present
    elif category in (AqiCategory.POOR, AqiCategory.VERY_POOR, AqiCategory.SEVERE):
        allow_strenuous = False
        allow_child_play = False
        recommend_mask = True
        recommend_windows_closed = True
        recommend_hepa = True
    else:  # UNAVAILABLE — precautionary, never assume safe
        allow_strenuous = False
        allow_child_play = False
        recommend_mask = False
        recommend_windows_closed = False
        recommend_hepa = True

    is_stale = current_aqi.freshness_status == FreshnessStatus.STALE
    safe_windows = [] if is_stale else extract_safe_forecast_windows(forecasts or [])
    allow_safe_window_claims = (not is_stale) and bool(safe_windows)

    medical_escalation = category == AqiCategory.SEVERE or detect_medical_escalation_query(
        user_query
    )

    constraints = RiskConstraints(
        allow_strenuous_outdoor=allow_strenuous,
        allow_child_outdoor_play=allow_child_play,
        recommend_mask_outdoors=recommend_mask,
        recommend_windows_closed=recommend_windows_closed,
        recommend_hepa_if_owned=recommend_hepa,
        require_freshness_caveat=is_stale or category == AqiCategory.UNAVAILABLE,
        allow_specific_safe_window_claims=allow_safe_window_claims,
        medical_escalation_required=medical_escalation,
    )

    return RiskAssessmentResult(
        severity_tier=category,
        aqi_value=current_aqi.aqi,
        sensitive_groups_present=sensitive_present,
        sensitive_group_reasons=sensitive_reasons,
        constraints=constraints,
        safe_forecast_windows=safe_windows,
        summary_guidance=get_default_health_guidance(category),
    )
