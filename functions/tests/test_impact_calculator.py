"""Unit tests for deterministic impact calculator (emissions vs. exposure separation)."""

from __future__ import annotations

import pytest

from app.domain.impact_calculator import compute_impact
from app.schemas.impact import ImpactActionType, ImpactDomain, ImpactLogRequest
from app.utils.errors import ValidationError


def test_carpool_co2_avoided_matches_prd_worked_example() -> None:
    # 20 km petrol car solo (0.170 kg/km) -> carpool with 3 occupants = 2.267 kg CO2e avoided
    result = compute_impact(
        ImpactLogRequest(
            action_type=ImpactActionType.CARPOOL,
            impact_domain=ImpactDomain.EMISSIONS_REDUCTION,
            distance_km=20.0,
            baseline_mode="petrol_car_solo",
            occupancy=3,
            logged_date="2026-11-25",
        )
    )
    assert result.impact_domain == ImpactDomain.EMISSIONS_REDUCTION
    assert result.estimated_co2_avoided_kg == pytest.approx(2.267, abs=0.002)
    assert result.calculation_assumptions is not None
    assert result.calculation_assumptions.is_estimate is True
    assert result.exposure_context is None


def test_exposure_action_never_reports_co2_avoided() -> None:
    result = compute_impact(
        ImpactLogRequest(
            action_type=ImpactActionType.INDOOR_EXERCISE_SWAP,
            impact_domain=ImpactDomain.EXPOSURE_REDUCTION,
            aqi_at_time=342,
            duration_minutes=40,
            activity_replaced="outdoor morning walk",
            logged_date="2026-11-25",
        )
    )
    assert result.impact_domain == ImpactDomain.EXPOSURE_REDUCTION
    assert result.estimated_co2_avoided_kg is None
    assert result.calculation_assumptions is None
    assert result.exposure_context is not None
    assert result.exposure_context.aqi_at_time == 342


def test_cross_domain_action_rejected() -> None:
    with pytest.raises(ValidationError):
        compute_impact(
            ImpactLogRequest(
                action_type=ImpactActionType.HEPA_PURIFIER_USE,
                impact_domain=ImpactDomain.EMISSIONS_REDUCTION,
                logged_date="2026-11-25",
            )
        )


def test_carpool_requires_at_least_two_occupants() -> None:
    with pytest.raises(ValidationError):
        compute_impact(
            ImpactLogRequest(
                action_type=ImpactActionType.CARPOOL,
                impact_domain=ImpactDomain.EMISSIONS_REDUCTION,
                distance_km=15.0,
                occupancy=1,
                logged_date="2026-11-25",
            )
        )
