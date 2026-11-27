"""Bounded deterministic domain tools for the 7-node LangGraph workflow.

Every tool operates strictly on verified environmental snapshots, forecast points,
and sanitized household/indoor context — zero hallucinated readings or fabricated
safe windows.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import AirQualityResponse, ForecastPoint
from app.schemas.planner import IndoorQuestionnaire, RiskAssessmentResult
from app.schemas.profile import SanitizedContext

_TIME_HHMM_RE = re.compile(r"\b(\d{1,2}):(\d{2})\b")

_EXERCISE_WINDOW_HOURS: dict[str, tuple[int, int]] = {
    "morning": (6, 10),
    "afternoon": (12, 16),
    "evening": (17, 20),
    "flexible": (7, 19),
}

TOOL_REGISTRY: dict[str, str] = {
    "analyze_forecast_windows": "Inspect real hourly forecast points for cleaner/peak hours.",
    "estimate_indoor_outdoor_interaction": "Combine live outdoor AQI with household gear & indoor habits.",
    "lookup_harm_reduction_playbooks": "Return realistic minimum-loss steps for daily habits and gaps.",
    "compare_commute_exposure_and_co2": "Compare commute exposure and estimated CO2e trade-offs.",
    "analyze_my_impact_history": "Summarize 14-day emissions avoided and exposure-protection streak.",
    "analyze_family_schedule_risks": "Map household member routines & exercise window against hourly AQI.",
    "analyze_city_pollutants_and_weather": "Analyze city pollutant mix (PM2.5/PM10 ratio), wind dispersion & haze.",
}


def _format_clock_label(iso_timestamp: str) -> str:
    """Convert an ISO timestamp into a clean clock string like '2:00 PM' for user readability."""
    hour = _parse_forecast_hour(iso_timestamp)
    if hour is None:
        return iso_timestamp
    suffix = "AM" if hour < 12 else "PM"
    hour_12 = 12 if hour % 12 == 0 else hour % 12
    return f"{hour_12}:00 {suffix}"


def analyze_forecast_windows(
    *,
    env: AirQualityResponse,
    risk: RiskAssessmentResult,
) -> dict[str, Any]:
    """Tool 1: Inspect real hourly forecast points for the selected city."""
    city = env.location_name
    forecasts = env.forecasts or []
    valid_points = [pt for pt in forecasts if pt.estimated_naqi is not None]

    if not valid_points:
        return {
            "city": city,
            "hasForecastData": False,
            "allowSpecificSafeWindowClaims": False,
            "summary": (
                f"No hourly forecast points available for {city}; do NOT claim specific "
                "cleaner hours today."
            ),
            "safeWindows": [],
        }

    cleanest = min(valid_points, key=lambda p: p.estimated_naqi or 999)
    worst = max(valid_points, key=lambda p: p.estimated_naqi or 0)
    cleanest_clock = _format_clock_label(cleanest.forecast_for)
    worst_clock = _format_clock_label(worst.forecast_for)
    safe_windows = list(risk.safe_forecast_windows)

    if safe_windows:
        summary = (
            f"Forecast for {city} shows cleaner hours around {', '.join(safe_windows[:3])} "
            f"(lowest projected AQI ~{cleanest.estimated_naqi} around {cleanest_clock})."
        )
    else:
        summary = (
            f"Forecast for {city} stays above AQI 100 all day (no Good/Satisfactory outdoor window); "
            f"lowest projected hour is around {cleanest_clock} (~AQI {cleanest.estimated_naqi}) "
            f"vs. peak around {worst_clock} (~AQI {worst.estimated_naqi})."
        )

    return {
        "city": city,
        "hasForecastData": True,
        "allowSpecificSafeWindowClaims": bool(risk.constraints.allow_specific_safe_window_claims),
        "lowestForecastAqi": cleanest.estimated_naqi,
        "lowestForecastTime": cleanest.forecast_for,
        "lowestForecastClock": cleanest_clock,
        "peakForecastAqi": worst.estimated_naqi,
        "peakForecastTime": worst.forecast_for,
        "peakForecastClock": worst_clock,
        "safeWindows": safe_windows[:4],
        "summary": summary,
    }


def estimate_indoor_outdoor_interaction(
    *,
    env: AirQualityResponse,
    context: SanitizedContext,
    questionnaire: IndoorQuestionnaire | None,
) -> dict[str, Any]:
    """Tool 2: Combine selected city's live AQI with indoor sources & gear."""
    cur = env.current
    city = env.location_name
    equip = context.indoor_equipment
    q = questionnaire

    smoking = bool(q.indoor_smoking_present if q is not None else equip.indoor_smoking_present)
    has_hepa = bool(q.has_hepa_purifier if q is not None else equip.has_hepa_purifier)
    uses_exhaust = bool(q.uses_kitchen_exhaust if q is not None else equip.has_kitchen_exhaust)
    incense = bool(q.incense_or_dhoop_daily if q is not None else False)
    cooking_fuel = q.cooking_fuel if q is not None else "lpg_gas"
    cleaning = q.dust_cleaning_method if q is not None else "wet_mop"
    sealing = q.window_sealing_quality if q is not None else "moderate"

    drivers: list[str] = []
    outdoor_high = cur.aqi is not None and cur.aqi > 200
    outdoor_moderate_plus = cur.aqi is not None and cur.aqi > 150

    vulnerable_groups: list[str] = []
    if context.has_toddlers:
        vulnerable_groups.append("toddlers (0–5)")
    elif context.has_children:
        vulnerable_groups.append("children")
    if context.has_elderly:
        vulnerable_groups.append("older adults (60+)")
    if context.has_respiratory_or_cardiac_sensitivity:
        vulnerable_groups.append("respiratory/cardiac sensitivity")

    if cur.freshness_status == FreshnessStatus.UNAVAILABLE or cur.aqi is None:
        outdoor_note = f"Live outdoor AQI for {city} is currently unavailable."
    else:
        outdoor_note = f"{city} outdoor AQI is {cur.aqi} ({cur.category.value})."
        if outdoor_high:
            drivers.append(f"High outdoor smog infiltration in {city} (AQI {cur.aqi})")

    if smoking:
        drivers.append("Indoor tobacco smoke (trapped PM2.5 compounds outdoor smog)")
    if not uses_exhaust and cooking_fuel != "electric_induction":
        drivers.append(f"Unvented {cooking_fuel.replace('_', ' ')} cooking fumes")
    if incense:
        drivers.append("Daily incense/dhoop combustion particles")
    if cleaning == "dry_broom":
        drivers.append("Dry broom sweeping resuspending settled PM10 dust")
    if sealing == "poor" and outdoor_high:
        drivers.append("Loose window/door gaps pulling outdoor smog indoors")
    if not has_hepa and (outdoor_high or smoking or incense):
        drivers.append("No HEPA purifier available — requires zero-cost sealing & exhaust tactics")
    if vulnerable_groups and (drivers or outdoor_moderate_plus):
        drivers.append(
            f"Heightened indoor sensitivity for household members ({', '.join(vulnerable_groups)})"
        )

    has_vulnerability = bool(vulnerable_groups)
    compound_severity = (
        "high"
        if (outdoor_high and (smoking or not uses_exhaust or not has_hepa or has_vulnerability))
        or (has_vulnerability and (smoking or len(drivers) >= 2))
        or len(drivers) >= 3
        else "elevated"
        if len(drivers) >= 1 or (has_vulnerability and outdoor_moderate_plus)
        else "moderate"
    )

    return {
        "city": city,
        "outdoorAqi": cur.aqi,
        "outdoorCategory": cur.category.value,
        "outdoorSummary": outdoor_note,
        "householdMembersCount": len(context.member_descriptors),
        "memberDescriptors": list(context.member_descriptors),
        "vulnerableGroups": vulnerable_groups,
        "hasHepaPurifier": has_hepa,
        "indoorSmokingPresent": smoking,
        "usesKitchenExhaust": uses_exhaust,
        "incenseOrDhoopDaily": incense,
        "cookingFuel": cooking_fuel,
        "dustCleaningMethod": cleaning,
        "windowSealingQuality": sealing,
        "compoundSeverity": compound_severity,
        "rankedDrivers": drivers or [f"General outdoor air balance in {city}"],
    }


def lookup_harm_reduction_playbooks(
    *,
    env: AirQualityResponse,
    context: SanitizedContext,
    questionnaire: IndoorQuestionnaire | None,
    risk: RiskAssessmentResult,
) -> list[dict[str, str]]:
    """Tool 3: Return realistic, non-preachy minimum-loss playbooks tailored to real habits."""
    city = env.location_name
    aqi_label = (
        f"{city} AQI {env.current.aqi} ({env.current.category.value})"
        if env.current.aqi is not None
        else f"{city} (live AQI unavailable)"
    )
    equip = context.indoor_equipment
    q = questionnaire

    smoking = bool(q.indoor_smoking_present if q is not None else equip.indoor_smoking_present)
    has_hepa = bool(q.has_hepa_purifier if q is not None else equip.has_hepa_purifier)
    uses_exhaust = bool(q.uses_kitchen_exhaust if q is not None else equip.has_kitchen_exhaust)
    incense = bool(q.incense_or_dhoop_daily if q is not None else False)
    cleaning = q.dust_cleaning_method if q is not None else "wet_mop"
    sealing = q.window_sealing_quality if q is not None else "moderate"

    playbooks: list[dict[str, str]] = []

    if smoking:
        playbooks.append(
            {
                "habit": "indoor_smoking",
                "honestRisk": (
                    f"With {aqi_label}, indoor smoking traps dense PM2.5 and toxic smoke indoors "
                    "for hours, compounding lung strain for everyone in the home."
                ),
                "idealOption": "Keep all indoor rooms completely smoke-free.",
                "ifYouContinue": (
                    "If you still smoke, step fully onto an open balcony or outdoors with the "
                    "connecting door shut tight, avoid smoking near bedroom windows or kids' rooms, "
                    "run an exhaust/fan outward for 15–20 minutes afterward, and wash hands/change "
                    "outer shirt before holding children."
                ),
            }
        )

    if incense:
        playbooks.append(
            {
                "habit": "daily_incense_or_dhoop",
                "honestRisk": (
                    f"Burning incense or dhoop in closed rooms during {aqi_label} adds fine smoke "
                    "particles that cannot disperse when windows stay shut."
                ),
                "idealOption": "Use fresh flowers or electric/smokeless options on high-AQI days.",
                "ifYouContinue": (
                    "If daily puja/dhoop is essential to your routine, burn just 1 short stick "
                    "(or charcoal-free low-smoke variety) near an open balcony edge or running "
                    "exhaust fan, and keep bedroom doors closed for 20 minutes."
                ),
            }
        )

    if not has_hepa and risk.severity_tier in (
        AqiCategory.MODERATE,
        AqiCategory.POOR,
        AqiCategory.VERY_POOR,
        AqiCategory.SEVERE,
    ):
        playbooks.append(
            {
                "habit": "no_hepa_purifier",
                "honestRisk": (
                    f"Without a HEPA purifier during {aqi_label}, outdoor fine dust seeps indoors "
                    "and builds up in sleeping rooms."
                ),
                "idealOption": "Seal one main bedroom as a cleaner-air sanctuary.",
                "ifYouContinue": (
                    "Without buying a purifier today, place a damp towel/draft stopper along main "
                    "door bottom gaps, keep curtains drawn on traffic-facing windows, wet-mop "
                    "instead of dry sweeping, and run kitchen/bath exhaust briefly after cooking."
                ),
            }
        )

    if not uses_exhaust:
        playbooks.append(
            {
                "habit": "no_kitchen_exhaust",
                "honestRisk": (
                    f"Cooking fumes on gas/solid fuel spike indoor PM2.5 and NO2 — especially "
                    f"when {aqi_label} limits keeping all windows open."
                ),
                "idealOption": "Use a kitchen exhaust fan or induction where available.",
                "ifYouContinue": (
                    "If you do not have a chimney/exhaust fan, cover pots with lids, cook on back "
                    "burners at lower flame, close doors to bedrooms/living room while frying, and "
                    "place a small table fan facing out a cracked kitchen window only while cooking."
                ),
            }
        )

    if cleaning == "dry_broom":
        playbooks.append(
            {
                "habit": "dry_broom_sweeping",
                "honestRisk": "Dry sweeping kicks settled PM10 dust back into breathing height.",
                "idealOption": "Switch to damp mopping or a HEPA vacuum.",
                "ifYouContinue": (
                    "If sweeping is quicker before mopping, lightly sprinkle water or use a "
                    "barely-damp cloth wrapped over the broom first, and keep kids/elders out of "
                    "that room for 15 minutes."
                ),
            }
        )

    if sealing == "poor" and risk.constraints.recommend_windows_closed:
        playbooks.append(
            {
                "habit": "poor_window_sealing",
                "honestRisk": f"Window gaps let {aqi_label} smog enter continuously.",
                "idealOption": "Add inexpensive rubber weather-stripping tape around frame gaps.",
                "ifYouContinue": (
                    "For an immediate zero-cost fix tonight, tuck a rolled towel at the bottom of "
                    "balcony doors and keep thick curtains closed during rush-hour smog peaks."
                ),
            }
        )

    if context.primary_commute_mode == "two_wheeler" and risk.constraints.recommend_mask_outdoors:
        playbooks.append(
            {
                "habit": "two_wheeler_commute",
                "honestRisk": (
                    f"Riding a two-wheeler in {aqi_label} puts you directly in roadside tailpipe "
                    "exhaust."
                ),
                "idealOption": "Shift to metro/bus or carpool on high-AQI days when feasible.",
                "ifYouContinue": (
                    "If you must ride your two-wheeler today, wear a tight-fitting N95 mask under "
                    "a closed-visor helmet, avoid idling right behind buses/trucks at signals, and "
                    "rinse your face and nose with plain water after arriving."
                ),
            }
        )

    return playbooks


def compare_commute_exposure_and_co2(
    *,
    env: AirQualityResponse,
    context: SanitizedContext,
) -> dict[str, Any]:
    """Tool 4: Evaluate realistic commute exposure + CO2 trade-offs for current city AQI."""
    city = env.location_name
    mode = context.primary_commute_mode
    km = round(context.daily_commute_km, 1)
    aqi = env.current.aqi

    if mode == "wfh" or km <= 0:
        return {
            "city": city,
            "mode": mode,
            "dailyKm": km,
            "exposureNote": "Working from home already avoids peak roadside exhaust exposure.",
            "realisticTip": "Focus on indoor ventilation and short errands during cleaner hours.",
        }

    # Approximate DEFRA/India GHG petrol car factor (~0.171 kg CO2e/km)
    solo_car_co2 = round(km * 0.171, 2)
    carpool_saved = round(solo_car_co2 * 0.5, 2) if mode == "personal_car" else 0.0

    if mode == "personal_car":
        realistic_tip = (
            f"Keep AC on recirculate mode in {city} traffic (not fresh-air intake) to cut cabin "
            f"PM2.5; carpooling your {km} km trip saves ~{carpool_saved} kg CO2e (estimate)."
        )
    elif mode == "two_wheeler":
        realistic_tip = (
            f"For your {km} km ride in {city}"
            + (f" (AQI {aqi})" if aqi is not None else "")
            + ", use a snug N95 under a closed-visor helmet or take metro/bus when available."
        )
    else:
        realistic_tip = (
            f"Keep a snug N95 mask handy while walking to/from transit stops in {city}"
            + (f" (AQI {aqi})." if aqi is not None else ".")
        )

    return {
        "city": city,
        "mode": mode,
        "dailyKm": km,
        "estimatedDailyCarCo2Kg": solo_car_co2 if mode == "personal_car" else None,
        "realisticTip": realistic_tip,
    }


def _compute_active_streak(daily_series: list[dict[str, Any]]) -> tuple[int, int]:
    """Compute (current_streak_days, active_days_in_window) from chronological dailySeries."""
    if not daily_series:
        return 0, 0

    active_flags = [
        (float(day.get("estimatedCo2Kg") or 0.0) > 0.0) or (int(day.get("exposureActions") or 0) > 0)
        for day in daily_series
    ]
    active_days = sum(1 for flag in active_flags if flag)

    # Allow streak to continue if today has no log yet but yesterday did.
    idx = len(active_flags) - 1
    if idx >= 0 and not active_flags[idx]:
        idx -= 1
    streak = 0
    while idx >= 0 and active_flags[idx]:
        streak += 1
        idx -= 1
    return streak, active_days


def analyze_my_impact_history(
    *,
    impact_summary: dict[str, Any] | None,
    risk: RiskAssessmentResult,
) -> dict[str, Any]:
    """Tool 5: Deterministically summarize user's 14-day emissions & exposure logs.

    Strictly separates personal exposure reduction from estimated CO2e emissions avoided.
    Never invents past actions or CO2 savings when history is empty or unavailable.
    """
    if not impact_summary:
        return {
            "hasHistory": False,
            "windowDays": 14,
            "emissions": {
                "totalEstimatedCo2AvoidedKg": 0.0,
                "actionCount": 0,
                "isEstimate": True,
            },
            "exposure": {
                "totalProtectiveActions": 0,
                "totalProtectedMinutes": 0,
            },
            "activeDaysLast14": 0,
            "currentStreakDays": 0,
            "lastLoggedDate": None,
            "recommendedNextAction": (
                "No clean-air or commute actions logged yet. Log one protective habit (indoor workout or HEPA run) "
                "or one lower-emission commute swap (metro/carpool/WFH) to start tracking."
            ),
            "separationNote": "Emissions avoided (kg CO2e estimate) and personal exposure protection are tracked separately.",
        }

    emissions = impact_summary.get("emissions") or {}
    exposure = impact_summary.get("exposure") or {}
    daily_series = impact_summary.get("dailySeries") or []
    recent_logs = impact_summary.get("recentLogs") or []

    total_co2 = round(float(emissions.get("totalEstimatedCo2AvoidedKg") or 0.0), 3)
    emissions_count = int(emissions.get("actionCount") or 0)
    by_em_type = emissions.get("byActionTypeKg") or {}
    top_em_type = max(by_em_type.items(), key=lambda kv: float(kv[1]))[0] if by_em_type else None

    exposure_count = int(exposure.get("totalProtectiveActions") or 0)
    protected_minutes = int(exposure.get("totalProtectedMinutes") or 0)
    by_exp_type = exposure.get("byActionTypeCount") or {}
    top_exp_type = max(by_exp_type.items(), key=lambda kv: int(kv[1]))[0] if by_exp_type else None

    streak_days, active_days = _compute_active_streak(daily_series)
    last_logged = str(recent_logs[0].get("loggedDate")) if recent_logs else None
    has_history = (emissions_count + exposure_count) > 0

    avg_co2_per_action = round(total_co2 / emissions_count, 2) if emissions_count > 0 else 0.0
    projected_weekly_co2 = round(avg_co2_per_action * 2, 2) if emissions_count > 0 else None

    if risk.severity_tier in (AqiCategory.POOR, AqiCategory.VERY_POOR, AqiCategory.SEVERE):
        next_tip = (
            "Today's air is elevated — prioritize a personal exposure-protection action "
            "(indoor exercise swap, sealing rooms, or N95 commute) and log it under Exposure Protection."
        )
    elif emissions_count == 0:
        next_tip = (
            "Air allows flexible planning — try logging one emissions-saving commute swap "
            "(public transit, carpool, or WFH) to start your estimated CO2e tracker."
        )
    else:
        next_tip = (
            f"Repeating your top swap ({(top_em_type or 'commute_swap').replace('_', ' ')}) "
            f"twice a week would add ~{projected_weekly_co2} kg CO2e avoided/week (estimate)."
        )

    return {
        "hasHistory": has_history,
        "windowDays": int(impact_summary.get("windowDays") or 14),
        "emissions": {
            "totalEstimatedCo2AvoidedKg": total_co2,
            "actionCount": emissions_count,
            "topActionType": top_em_type,
            "projectedWeeklyIfRepeated2xKg": projected_weekly_co2,
            "isEstimate": True,
        },
        "exposure": {
            "totalProtectiveActions": exposure_count,
            "totalProtectedMinutes": protected_minutes,
            "topActionType": top_exp_type,
        },
        "activeDaysLast14": active_days,
        "currentStreakDays": streak_days,
        "lastLoggedDate": last_logged,
        "recommendedNextAction": next_tip,
        "separationNote": "Emissions avoided (kg CO2e estimate) and personal exposure protection are tracked separately.",
    }


def _parse_forecast_hour(forecast_for: str) -> int | None:
    try:
        return datetime.fromisoformat(forecast_for.replace("Z", "+00:00")).hour
    except ValueError:
        match = _TIME_HHMM_RE.search(forecast_for)
        if match:
            hour = int(match.group(1))
            if 0 <= hour <= 23:
                return hour
        return None


def _match_forecast_for_hour(
    valid_points: list[ForecastPoint], target_hour: int
) -> ForecastPoint | None:
    best: tuple[int, ForecastPoint] | None = None
    for pt in valid_points:
        pt_hour = _parse_forecast_hour(pt.forecast_for)
        if pt_hour is None:
            continue
        diff = min(abs(pt_hour - target_hour), 24 - abs(pt_hour - target_hour))
        if best is None or diff < best[0]:
            best = (diff, pt)
    if best is not None and best[0] <= 2:
        return best[1]
    return None


def _classify_slot_risk(aqi: int | None, *, sensitive: bool) -> str:
    if aqi is None:
        return "unknown"
    if aqi > 200 or (sensitive and aqi > 150):
        return "high"
    if aqi > 100 or (sensitive and aqi > 80):
        return "moderate"
    return "low"


def analyze_family_schedule_risks(
    *,
    context: SanitizedContext,
    env: AirQualityResponse,
    risk: RiskAssessmentResult,
) -> dict[str, Any]:
    """Tool 6: Map PII-free family routines & exercise window against hourly city forecasts."""
    city = env.location_name
    valid_points = [pt for pt in (env.forecasts or []) if pt.estimated_naqi is not None]
    forecast_available = bool(valid_points)

    sensitive_groups: list[str] = []
    if context.has_toddlers:
        sensitive_groups.append("toddlers (0-5)")
    elif context.has_children:
        sensitive_groups.append("children")
    if context.has_elderly:
        sensitive_groups.append("older adults (60+)")
    if context.has_respiratory_or_cardiac_sensitivity:
        sensitive_groups.append("respiratory/cardiac sensitivity")

    schedule_risks: list[dict[str, Any]] = []
    for hint in context.member_schedule_hints[:6]:
        role_part = hint.split(":", 1)[0].strip()
        is_sensitive_member = any(
            tok in role_part.lower() for tok in ("child", "toddler", "elderly", "senior")
        ) or context.has_respiratory_or_cardiac_sensitivity

        times_found = _TIME_HHMM_RE.findall(hint)
        if not times_found:
            schedule_risks.append(
                {
                    "target": role_part,
                    "window": hint,
                    "projectedAqi": env.current.aqi,
                    "riskLevel": _classify_slot_risk(env.current.aqi, sensitive=is_sensitive_member),
                }
            )
            continue

        for hh_str, mm_str in times_found[:2]:
            hour = int(hh_str)
            if not (0 <= hour <= 23):
                continue
            matched = _match_forecast_for_hour(valid_points, hour) if forecast_available else None
            projected_aqi = matched.estimated_naqi if matched else env.current.aqi
            slot_level = _classify_slot_risk(projected_aqi, sensitive=is_sensitive_member)
            schedule_risks.append(
                {
                    "target": role_part,
                    "window": f"{hour:02d}:{mm_str}",
                    "projectedAqi": projected_aqi,
                    "basis": "hourly_forecast" if matched else "current_reading",
                    "riskLevel": slot_level,
                }
            )

    # Evaluate household exercise preference window against forecast points
    ex_start, ex_end = _EXERCISE_WINDOW_HOURS.get(context.exercise_window, (6, 10))
    window_points = [
        pt
        for pt in valid_points
        if (h := _parse_forecast_hour(pt.forecast_for)) is not None and ex_start <= h <= ex_end
    ]
    ex_aqi = (
        round(sum(pt.estimated_naqi or 0 for pt in window_points) / len(window_points))
        if window_points
        else env.current.aqi
    )
    exercise_slot_risk = _classify_slot_risk(ex_aqi, sensitive=bool(sensitive_groups))

    cleaner_hours = (
        list(risk.safe_forecast_windows[:3])
        if risk.constraints.allow_specific_safe_window_claims
        else []
    )

    if not forecast_available:
        summary = (
            f"Hourly forecast unavailable for {city}; evaluate {len(context.member_descriptors)} "
            "household member routine(s) strictly against current live AQI without claiming safer hours."
        )
    elif cleaner_hours:
        summary = (
            f"Evaluated {len(schedule_risks)} family routine slot(s) in {city}; "
            f"lower-AQI forecast hours exist around {', '.join(cleaner_hours)}."
        )
    else:
        summary = (
            f"Evaluated {len(schedule_risks)} family routine slot(s) in {city}; "
            "no low-pollution outdoor forecast window is available today."
        )

    return {
        "city": city,
        "profileComplete": context.profile_complete,
        "householdMemberCount": len(context.member_descriptors),
        "sensitiveGroups": sensitive_groups,
        "forecastAvailable": forecast_available,
        "scheduleRisks": schedule_risks[:6],
        "exercisePreference": {
            "window": context.exercise_window,
            "activity": context.exercise_activity_type,
            "prefersOutdoor": context.prefers_outdoor_exercise,
            "projectedAqi": ex_aqi,
            "riskLevel": exercise_slot_risk,
        },
        "cleanerForecastHours": cleaner_hours,
        "summary": summary,
    }


def analyze_city_pollutants_and_weather(
    *,
    env: AirQualityResponse,
    risk: RiskAssessmentResult,
) -> dict[str, Any]:
    """Tool 7: Deterministically analyze city pollutant mix, PM2.5/PM10 ratio & wind dispersion."""
    city = env.location_name
    cur = env.current
    weather = env.weather

    measured: dict[str, float] = {}
    unavailable: list[str] = []
    for reading in cur.readings:
        if reading.value is not None and reading.freshness_status != FreshnessStatus.UNAVAILABLE:
            measured[reading.pollutant] = round(float(reading.value), 1)
        else:
            unavailable.append(reading.pollutant)

    pm25 = measured.get("PM2.5")
    pm10 = measured.get("PM10")
    ratio: float | None = None
    signature = "unavailable"
    filtration_hint = "Follow live AQI precautions; pollutant breakdown is partial."

    if pm25 is not None and pm10 is not None and pm10 > 0:
        ratio = round(pm25 / pm10, 2)
        if ratio >= 0.6:
            signature = "fine_combustion_smog"
            filtration_hint = (
                "High PM2.5/PM10 ratio indicates fine combustion/traffic smog — cloth masks are "
                "ineffective; use snug N95 outdoors and sealed doors/HEPA indoors."
            )
        elif ratio <= 0.4:
            signature = "coarse_dust_dominant"
            filtration_hint = (
                "Coarse dust (PM10) dominates — keep road-facing windows shut, wet-mop settled "
                "dust, and wear an N95 near construction or dusty roads."
            )
        else:
            signature = "mixed_urban_particulate"
            filtration_hint = (
                "Mixed fine smog and road dust — combine sealed indoor spaces with wet mopping "
                "and snug N95 protection during outdoor commutes."
            )
    elif pm25 is not None:
        signature = "pm25_measured_only"
        filtration_hint = (
            "PM2.5 is measured while PM10 is unavailable — focus on fine-particle protection "
            "(N95 outdoors, tight window sealing indoors)."
        )

    wind = weather.wind_speed_kmh
    if wind is None:
        wind_dispersion = "unavailable"
    elif wind < 6.0:
        wind_dispersion = "stagnant_trapping"
    elif wind <= 15.0:
        wind_dispersion = "moderate_mixing"
    else:
        wind_dispersion = "active_clearing"

    humidity = weather.humidity_pct
    if humidity is None:
        humidity_note = "unavailable"
    elif humidity >= 75.0:
        humidity_note = "high_humidity_haze"
    elif humidity <= 30.0:
        humidity_note = "dry_dust_prone"
    else:
        humidity_note = "normal"

    summary_parts = [
        f"{city} AQI {cur.aqi} ({cur.category.value})"
        if cur.aqi is not None
        else f"{city} live AQI unavailable"
    ]
    if ratio is not None:
        summary_parts.append(f"PM2.5/PM10={ratio} ({signature.replace('_', ' ')})")
    if wind is not None:
        summary_parts.append(f"wind {round(wind, 1)} km/h ({wind_dispersion.replace('_', ' ')})")
    if unavailable:
        summary_parts.append(f"unavailable sensors: {', '.join(unavailable)}")

    return {
        "city": city,
        "freshness": cur.freshness_status.value,
        "riskTier": risk.severity_tier.value,
        "dominantPollutant": cur.dominant_pollutant,
        "measuredPollutants": measured,
        "unavailablePollutants": unavailable,
        "pm25ToPm10Ratio": ratio,
        "particleSignature": signature,
        "filtrationHint": filtration_hint,
        "windSpeedKmh": round(wind, 1) if wind is not None else None,
        "windDispersion": wind_dispersion,
        "humidityPct": round(humidity, 1) if humidity is not None else None,
        "humidityNote": humidity_note,
        "tempC": round(weather.temp_c, 1) if weather.temp_c is not None else None,
        "summary": "; ".join(summary_parts),
    }
