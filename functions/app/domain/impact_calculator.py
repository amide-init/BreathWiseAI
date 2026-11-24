"""Deterministic Sustainability & Exposure Impact Calculator (PRD Module 5).

Strictly separates environmental CO2 emissions avoided from personal exposure
reduction, and attaches full transparent assumptions to every CO2 estimate.
"""

from __future__ import annotations

from app.config.constants import (
    EMISSION_FACTOR_SOURCE,
    INDIA_GRID_EMISSION_FACTOR_KG_PER_KWH,
    INDIA_GRID_FACTOR_SOURCE,
    TRANSPORT_EMISSION_FACTORS,
)
from app.schemas.impact import (
    ExposureContext,
    ImpactActionType,
    ImpactCalculationAssumptions,
    ImpactComputationResult,
    ImpactDomain,
    ImpactLogRequest,
)
from app.utils.errors import ValidationError

_EXPOSURE_ACTION_TYPES = frozenset(
    {
        ImpactActionType.INDOOR_EXERCISE_SWAP,
        ImpactActionType.HEPA_PURIFIER_USE,
        ImpactActionType.N95_MASK_USED,
        ImpactActionType.REDUCED_OUTDOOR_EXPOSURE,
    }
)

_COMMUTE_ACTION_TO_DEFAULT_ALT: dict[ImpactActionType, str] = {
    ImpactActionType.PUBLIC_TRANSIT: "metro_rail",
    ImpactActionType.WALK_CYCLE: "walk_cycle",
    ImpactActionType.WFH: "wfh",
}


def compute_impact(req: ImpactLogRequest) -> ImpactComputationResult:
    """Deterministically compute emissions avoided OR exposure context (never mixed)."""
    if req.impact_domain == ImpactDomain.EXPOSURE_REDUCTION:
        return _compute_exposure_record(req)
    return _compute_emissions_record(req)


def _compute_exposure_record(req: ImpactLogRequest) -> ImpactComputationResult:
    if req.action_type not in _EXPOSURE_ACTION_TYPES:
        raise ValidationError(
            f"Action '{req.action_type}' does not belong to exposure_reduction domain."
        )

    default_titles = {
        ImpactActionType.INDOOR_EXERCISE_SWAP: "Swapped outdoor exercise for indoor routine",
        ImpactActionType.HEPA_PURIFIER_USE: "Ran HEPA air purifier during elevated pollution",
        ImpactActionType.N95_MASK_USED: "Wore N95 particulate mask during outdoor trip",
        ImpactActionType.REDUCED_OUTDOOR_EXPOSURE: "Shifted outdoor family activity indoors",
    }

    return ImpactComputationResult(
        impact_domain=ImpactDomain.EXPOSURE_REDUCTION,
        title=req.title or default_titles[req.action_type],
        estimated_co2_avoided_kg=None,  # Strictly NEVER converted into CO2
        calculation_assumptions=None,
        exposure_context=ExposureContext(
            aqi_at_time=req.aqi_at_time,
            duration_minutes=req.duration_minutes,
            activity_replaced=req.activity_replaced,
        ),
    )


def _compute_emissions_record(req: ImpactLogRequest) -> ImpactComputationResult:
    if req.action_type in _EXPOSURE_ACTION_TYPES:
        raise ValidationError(
            f"Exposure-protection action '{req.action_type}' cannot be logged as emissions_reduction."
        )

    if req.action_type == ImpactActionType.ENERGY_SAVING:
        return _compute_energy_saving(req)

    return _compute_commute_substitution(req)


def _compute_energy_saving(req: ImpactLogRequest) -> ImpactComputationResult:
    if req.kwh_saved is None or req.kwh_saved <= 0:
        raise ValidationError("kwhSaved must be > 0 for energy_saving actions.")

    avoided_kg = round(req.kwh_saved * INDIA_GRID_EMISSION_FACTOR_KG_PER_KWH, 3)
    assumptions = ImpactCalculationAssumptions(
        formula="kwh_saved * grid_emission_factor_kg_per_kwh",
        baseline_mode="grid_electricity",
        alternative_mode="avoided_consumption",
        kwh_saved=req.kwh_saved,
        factor_source=INDIA_GRID_FACTOR_SOURCE,
        is_estimate=True,
    )
    return ImpactComputationResult(
        impact_domain=ImpactDomain.EMISSIONS_REDUCTION,
        title=req.title or f"Saved {req.kwh_saved:.1f} kWh household electricity",
        estimated_co2_avoided_kg=avoided_kg,
        calculation_assumptions=assumptions,
        exposure_context=None,
    )


def _compute_commute_substitution(req: ImpactLogRequest) -> ImpactComputationResult:
    if req.distance_km is None or req.distance_km <= 0:
        raise ValidationError("distanceKm must be > 0 for commute emissions calculations.")

    baseline_key = req.baseline_mode or "petrol_car_solo"
    if baseline_key not in TRANSPORT_EMISSION_FACTORS:
        raise ValidationError(f"Unsupported baselineMode '{baseline_key}'.")

    baseline = TRANSPORT_EMISSION_FACTORS[baseline_key]
    baseline_occ = baseline.default_occupancy

    if req.action_type == ImpactActionType.CARPOOL:
        if req.occupancy < 2:
            raise ValidationError("Carpool occupancy must be at least 2 people.")
        alt_key = req.alternative_mode or baseline_key
        if alt_key not in TRANSPORT_EMISSION_FACTORS:
            raise ValidationError(f"Unsupported alternativeMode '{alt_key}'.")
        alternative = TRANSPORT_EMISSION_FACTORS[alt_key]
        alt_occ = req.occupancy
    else:
        alt_key = req.alternative_mode or _COMMUTE_ACTION_TO_DEFAULT_ALT[req.action_type]
        if alt_key not in TRANSPORT_EMISSION_FACTORS:
            raise ValidationError(f"Unsupported alternativeMode '{alt_key}'.")
        alternative = TRANSPORT_EMISSION_FACTORS[alt_key]
        alt_occ = 1 if alternative.per_passenger else max(1, req.occupancy)

    baseline_per_passenger = baseline.kg_co2e_per_km / (
        1 if baseline.per_passenger else baseline_occ
    )
    alt_per_passenger = alternative.kg_co2e_per_km / (1 if alternative.per_passenger else alt_occ)
    avoided_kg = round(max(0.0, req.distance_km * (baseline_per_passenger - alt_per_passenger)), 3)

    default_title = (
        f"Carpooled {req.distance_km:.0f} km ({alt_occ} occupants)"
        if req.action_type == ImpactActionType.CARPOOL
        else f"Switched {req.distance_km:.0f} km commute to {alternative.label}"
    )

    assumptions = ImpactCalculationAssumptions(
        formula="max(0, distance_km * ((ef_baseline / occ_baseline) - (ef_alternative / occ_alternative)))",
        baseline_mode=baseline.label,
        alternative_mode=f"Carpool ({alternative.label}, {alt_occ} occupants)"
        if req.action_type == ImpactActionType.CARPOOL
        else alternative.label,
        distance_km=req.distance_km,
        baseline_occupancy=baseline_occ,
        alternative_occupancy=alt_occ,
        baseline_factor_kg_per_km=baseline.kg_co2e_per_km,
        alternative_factor_kg_per_km=alternative.kg_co2e_per_km,
        factor_source=EMISSION_FACTOR_SOURCE,
        is_estimate=True,
    )

    return ImpactComputationResult(
        impact_domain=ImpactDomain.EMISSIONS_REDUCTION,
        title=req.title or default_title,
        estimated_co2_avoided_kg=avoided_kg,
        calculation_assumptions=assumptions,
        exposure_context=None,
    )
