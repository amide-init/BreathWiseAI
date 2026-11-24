"""Family profile and PII-sanitized AI context schemas (PRD Module 2)."""

from __future__ import annotations

from pydantic import Field

from app.schemas.common import ApiModel


class OptionalHealthProfile(ApiModel):
    """Optional & private health sensitivities; never logged or used for diagnosis."""

    has_respiratory_sensitivity: bool = False
    has_cardiac_sensitivity: bool = False
    is_pregnant: bool = False
    notes: str | None = Field(default=None, max_length=200)


class MemberSchedule(ApiModel):
    """Daily routine times (HH:MM) for a household member."""

    leave_home_time: str | None = None
    return_home_time: str | None = None
    outdoor_play_or_exercise_time: str | None = None


class FamilyMember(ApiModel):
    """Individual household member stored under families/{familyId}/members."""

    member_id: str | None = None
    nickname: str = Field(min_length=1, max_length=60)
    role: str
    age_group: str
    schedule: MemberSchedule = Field(default_factory=MemberSchedule)
    commute_mode: str | None = None
    optional_health_profile: OptionalHealthProfile | None = None


class TransportationHabits(ApiModel):
    """Household commute profile used for planning & sustainability alternatives."""

    primary_mode: str = "personal_car"
    daily_commute_km: float = Field(default=15.0, ge=0.0, le=300.0)
    vehicle_fuel_type: str = "petrol"
    occupancy: int = Field(default=1, ge=1, le=10)


class ExercisePreferences(ApiModel):
    """Household outdoor/indoor exercise preferences."""

    prefers_outdoor: bool = True
    preferred_window: str = "morning"
    activity_type: str = "walk"


class IndoorEquipment(ApiModel):
    """Home clean-air equipment availability."""

    has_hepa_purifier: bool = False
    purifier_rooms_count: int = Field(default=0, ge=0, le=20)
    has_kitchen_exhaust: bool = False
    has_cross_ventilation: bool = True
    has_n95_masks: bool = False
    indoor_smoking_present: bool = False


class SanitizedContext(ApiModel):
    """PII-free household context projection safe to pass to Node 3 & Node 4."""

    profile_complete: bool = False
    location_label: str = ""
    member_descriptors: list[str] = Field(default_factory=list)
    has_children: bool = False
    has_toddlers: bool = False
    has_elderly: bool = False
    has_respiratory_or_cardiac_sensitivity: bool = False
    primary_commute_mode: str = "personal_car"
    daily_commute_km: float = 15.0
    prefers_outdoor_exercise: bool = True
    exercise_window: str = "morning"
    indoor_equipment: IndoorEquipment = Field(default_factory=IndoorEquipment)
