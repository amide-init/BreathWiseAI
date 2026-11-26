"""Bounded deterministic domain tools for the 7-node LangGraph workflow.

Every tool operates strictly on verified environmental snapshots, forecast points,
and sanitized household/indoor context — zero hallucinated readings or fabricated
safe windows.
"""

from __future__ import annotations

from typing import Any

from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import AirQualityResponse
from app.schemas.planner import IndoorQuestionnaire, RiskAssessmentResult
from app.schemas.profile import SanitizedContext


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
    safe_windows = list(risk.safe_forecast_windows)

    if safe_windows:
        summary = (
            f"Forecast for {city} shows cleaner hours around {', '.join(safe_windows[:3])} "
            f"(lowest projected AQI ~{cleanest.estimated_naqi} at {cleanest.forecast_for})."
        )
    else:
        summary = (
            f"Forecast for {city} stays elevated (lowest projected AQI ~{cleanest.estimated_naqi} "
            f"at {cleanest.forecast_for}, peak ~{worst.estimated_naqi}); no low-pollution outdoor "
            "window exists today."
        )

    return {
        "city": city,
        "hasForecastData": True,
        "allowSpecificSafeWindowClaims": bool(risk.constraints.allow_specific_safe_window_claims),
        "lowestForecastAqi": cleanest.estimated_naqi,
        "lowestForecastTime": cleanest.forecast_for,
        "peakForecastAqi": worst.estimated_naqi,
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

    compound_severity = (
        "high"
        if (outdoor_high and (smoking or not uses_exhaust or not has_hepa)) or len(drivers) >= 3
        else "elevated"
        if len(drivers) >= 1
        else "moderate"
    )

    return {
        "city": city,
        "outdoorAqi": cur.aqi,
        "outdoorCategory": cur.category.value,
        "outdoorSummary": outdoor_note,
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
