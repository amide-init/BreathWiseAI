"""Sustainability and exposure-protection impact tracking schemas (PRD Module 5)."""

from __future__ import annotations

from enum import StrEnum

from pydantic import Field

from app.schemas.common import ApiModel


class ImpactDomain(StrEnum):
    """Strictly separate environmental emissions reduction vs. personal exposure reduction."""

    EMISSIONS_REDUCTION = "emissions_reduction"
    EXPOSURE_REDUCTION = "exposure_reduction"


class ImpactActionType(StrEnum):
    """Supported logged user actions."""

    CARPOOL = "carpool"
    PUBLIC_TRANSIT = "public_transit"
    WALK_CYCLE = "walk_cycle"
    WFH = "wfh"
    ENERGY_SAVING = "energy_saving"
    INDOOR_EXERCISE_SWAP = "indoor_exercise_swap"
    HEPA_PURIFIER_USE = "hepa_purifier_use"
    N95_MASK_USED = "n95_mask_used"
    REDUCED_OUTDOOR_EXPOSURE = "reduced_outdoor_exposure"


class ImpactCalculationAssumptions(ApiModel):
    """Transparent calculation disclosure required on every CO2 avoided estimate."""

    formula: str
    baseline_mode: str
    alternative_mode: str
    distance_km: float | None = None
    baseline_occupancy: int | None = None
    alternative_occupancy: int | None = None
    baseline_factor_kg_per_km: float | None = None
    alternative_factor_kg_per_km: float | None = None
    kwh_saved: float | None = None
    factor_source: str
    is_estimate: bool = True


class ExposureContext(ApiModel):
    """Context metadata for personal exposure-reduction logs (never converted to CO2)."""

    aqi_at_time: int | None = None
    duration_minutes: int | None = None
    activity_replaced: str | None = None


class ImpactLogRequest(ApiModel):
    """Request payload for POST /api/v1/impact/log."""

    family_id: str | None = None
    action_type: ImpactActionType
    impact_domain: ImpactDomain
    title: str | None = Field(default=None, max_length=120)
    logged_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")

    # Emissions inputs (used when impact_domain == EMISSIONS_REDUCTION)
    distance_km: float | None = Field(default=None, gt=0.0, le=500.0)
    baseline_mode: str | None = None
    alternative_mode: str | None = None
    occupancy: int = Field(default=1, ge=1, le=10)
    kwh_saved: float | None = Field(default=None, gt=0.0, le=100.0)

    # Exposure inputs (used when impact_domain == EXPOSURE_REDUCTION)
    aqi_at_time: int | None = Field(default=None, ge=0, le=1000)
    duration_minutes: int | None = Field(default=None, ge=1, le=1440)
    activity_replaced: str | None = Field(default=None, max_length=120)


class ImpactComputationResult(ApiModel):
    """Deterministic calculation output from domain/impact_calculator.py."""

    impact_domain: ImpactDomain
    title: str
    estimated_co2_avoided_kg: float | None = None
    calculation_assumptions: ImpactCalculationAssumptions | None = None
    exposure_context: ExposureContext | None = None
