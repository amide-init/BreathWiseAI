"""Pydantic contracts for AI natural-language household & family parsing."""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import ApiModel


class ParsedMemberDraft(ApiModel):
    """Single family member extracted from natural language for user review."""

    nickname: str = Field(min_length=1, max_length=40)
    role: Literal[
        "working_adult",
        "homemaker",
        "child_school",
        "child_toddler",
        "elderly",
        "student",
        "other",
    ] = "working_adult"
    age_group: Literal["0_5", "6_12", "13_17", "18_45", "46_60", "60_plus"] = "18_45"
    has_respiratory_sensitivity: bool = False
    has_cardiac_sensitivity: bool = False
    is_pregnant: bool = False


class ParsedHouseholdDraft(ApiModel):
    """Editable household + family preview returned by `parse_household_profile`."""

    household_name: str = "My Household"
    city_mentioned: str | None = None
    primary_commute_mode: Literal[
        "personal_car",
        "two_wheeler",
        "public_transit",
        "walk_cycle",
        "wfh",
        "mixed",
    ] = "personal_car"
    daily_commute_km: float = Field(default=15.0, ge=0.0, le=200.0)
    exercise_activity_type: str = "walk"
    prefers_outdoor_exercise: bool = True
    has_hepa_purifier: bool = False
    has_kitchen_exhaust: bool = True
    indoor_smoking_present: bool = False
    incense_or_dhoop_daily: bool = False
    cooking_fuel: Literal["lpg_gas", "electric_induction", "biomass_solid", "mixed"] = "lpg_gas"
    dust_cleaning_method: Literal["dry_broom", "wet_mop", "hepa_vacuum", "mixed"] = "wet_mop"
    window_sealing_quality: Literal["poor", "moderate", "good"] = "moderate"
    members: list[ParsedMemberDraft] = Field(default_factory=list)
    summary_note: str = "Review the extracted family and home details below before saving."
    fallback_used: bool = False
