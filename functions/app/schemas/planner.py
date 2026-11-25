"""Risk assessment, daily planner, and indoor air advisor schemas (PRD Modules 3 & 4)."""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import ApiModel, AqiCategory, Citation, QuickDecision


class RiskConstraints(ApiModel):
    """Immutable deterministic constraints computed by Node 3 (risk_assessment)."""

    allow_strenuous_outdoor: bool
    allow_child_outdoor_play: bool
    recommend_mask_outdoors: bool
    recommend_windows_closed: bool
    recommend_hepa_if_owned: bool
    require_freshness_caveat: bool = False
    allow_specific_safe_window_claims: bool = False
    medical_escalation_required: bool = False


class RiskAssessmentResult(ApiModel):
    """Deterministic output produced by domain/risk_engine.py (zero LLM involvement)."""

    severity_tier: AqiCategory
    aqi_value: int | None = None
    sensitive_groups_present: bool = False
    sensitive_group_reasons: list[str] = Field(default_factory=list)
    constraints: RiskConstraints
    safe_forecast_windows: list[str] = Field(default_factory=list)
    summary_guidance: str
    quick_decisions: list[QuickDecision] = Field(default_factory=list)


class RecommendationItem(ApiModel):
    """Single clean-air action item enforcing PRD §6 Module 3's 4-part structure."""

    item_id: str
    title: str
    priority: Literal["high", "medium", "low"]
    category: Literal[
        "outdoor_activity",
        "commute",
        "indoor_air",
        "sustainability",
        "health_precaution",
        "cooking_ventilation",
    ]
    target_members: list[str] = Field(default_factory=list)
    what_to_do: str = Field(min_length=5)
    why: str = Field(min_length=5)
    alternative: str = Field(min_length=5)
    supporting_data: str = Field(min_length=3)


class DailyPlanSections(ApiModel):
    """Time-of-day plan sections."""

    morning: list[RecommendationItem] = Field(default_factory=list)
    afternoon: list[RecommendationItem] = Field(default_factory=list)
    evening: list[RecommendationItem] = Field(default_factory=list)


class IndoorQuestionnaire(ApiModel):
    """Module 4 indoor air quality questionnaire inputs."""

    cooking_fuel: Literal["lpg_gas", "electric_induction", "biomass_solid", "mixed"] = "lpg_gas"
    uses_kitchen_exhaust: bool = False
    has_hepa_purifier: bool = False
    indoor_smoking_present: bool = False
    incense_or_dhoop_daily: bool = False
    dust_cleaning_method: Literal["dry_broom", "wet_mop", "hepa_vacuum", "mixed"] = "wet_mop"
    window_sealing_quality: Literal["poor", "moderate", "good"] = "moderate"


class IndoorAssessmentResponse(ApiModel):
    """Module 4 indoor guidance explicitly labeled as questionnaire-estimated."""

    assessment_basis: Literal["estimated_questionnaire"] = "estimated_questionnaire"
    disclaimer: str = (
        "These insights are estimated from your home questionnaire and outdoor AQI "
        "— not measured by an indoor air sensor."
    )
    estimated_risk_level: Literal["low", "moderate", "elevated", "high"]
    key_indoor_sources: list[str] = Field(default_factory=list)
    recommendations: list[RecommendationItem] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)
    fallback_mode: bool = False
