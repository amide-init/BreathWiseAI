"""Use-case service for Sustainability & Exposure Impact Tracking (PRD Module 5 / FR-09, FR-10)."""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Any

from app.domain.impact_calculator import compute_impact
from app.repositories.impact_repo import ImpactRepository
from app.schemas.impact import ImpactDomain, ImpactLogRequest
from app.utils.datetime_utils import utc_now


class ImpactService:
    """Computes, persists, and summarizes strictly separated emissions & exposure metrics."""

    def __init__(self, *, impact_repo: ImpactRepository | None = None) -> None:
        self._repo = impact_repo or ImpactRepository()

    def log_action(self, *, user_id: str, req: ImpactLogRequest) -> dict[str, Any]:
        computed = compute_impact(req)
        payload: dict[str, Any] = {
            "familyId": req.family_id,
            "impactDomain": computed.impact_domain.value,
            "actionType": req.action_type.value,
            "title": computed.title,
            "loggedDate": req.logged_date,
            "estimatedCo2AvoidedKg": computed.estimated_co2_avoided_kg,
            "calculationAssumptions": computed.calculation_assumptions.model_dump(by_alias=True)
            if computed.calculation_assumptions
            else None,
            "exposureContext": computed.exposure_context.model_dump(by_alias=True)
            if computed.exposure_context
            else None,
        }
        return self._repo.save_log(user_id=user_id, payload=payload)

    def get_summary(self, *, user_id: str, days: int = 14) -> dict[str, Any]:
        clamped_days = max(7, min(days, 90))
        today = utc_now().date()
        start_date = (today - timedelta(days=clamped_days - 1)).isoformat()

        logs = self._repo.list_logs(user_id=user_id, start_date=start_date)

        total_co2_kg = 0.0
        emissions_action_count = 0
        exposure_action_count = 0
        total_protected_minutes = 0
        exposure_by_type: dict[str, int] = defaultdict(int)
        emissions_by_type: dict[str, float] = defaultdict(float)

        daily_co2: dict[str, float] = defaultdict(float)
        daily_exposure: dict[str, int] = defaultdict(int)

        for log in logs:
            domain = str(log.get("impactDomain") or "")
            action_type = str(log.get("actionType") or "other")
            logged_date = str(log.get("loggedDate") or "")

            if domain == ImpactDomain.EMISSIONS_REDUCTION.value:
                co2 = float(log.get("estimatedCo2AvoidedKg") or 0.0)
                total_co2_kg += co2
                emissions_action_count += 1
                emissions_by_type[action_type] = round(emissions_by_type[action_type] + co2, 3)
                if logged_date:
                    daily_co2[logged_date] = round(daily_co2[logged_date] + co2, 3)
            elif domain == ImpactDomain.EXPOSURE_REDUCTION.value:
                exposure_action_count += 1
                exposure_by_type[action_type] += 1
                ctx = log.get("exposureContext")
                if isinstance(ctx, dict) and isinstance(ctx.get("durationMinutes"), (int, float)):
                    total_protected_minutes += int(ctx["durationMinutes"])
                if logged_date:
                    daily_exposure[logged_date] += 1

        # Build contiguous date series for the last 7 days (or requested window up to 14 days for chart clarity)
        chart_days = min(clamped_days, 14)
        daily_series: list[dict[str, Any]] = []
        for offset in range(chart_days - 1, -1, -1):
            day = today - timedelta(days=offset)
            day_iso = day.isoformat()
            daily_series.append(
                {
                    "date": day_iso,
                    "label": day.strftime("%b %d"),
                    "estimatedCo2Kg": round(daily_co2.get(day_iso, 0.0), 3),
                    "exposureActions": daily_exposure.get(day_iso, 0),
                }
            )

        return {
            "windowDays": clamped_days,
            "emissions": {
                "totalEstimatedCo2AvoidedKg": round(total_co2_kg, 3),
                "actionCount": emissions_action_count,
                "byActionTypeKg": dict(emissions_by_type),
                "isEstimate": True,
            },
            "exposure": {
                "totalProtectiveActions": exposure_action_count,
                "totalProtectedMinutes": total_protected_minutes,
                "byActionTypeCount": dict(exposure_by_type),
            },
            "dailySeries": daily_series,
            "recentLogs": logs[:50],
        }

    def delete_action(self, *, user_id: str, log_id: str) -> dict[str, Any]:
        deleted = self._repo.delete_log(user_id=user_id, log_id=log_id)
        return {"deleted": deleted, "logId": log_id}
