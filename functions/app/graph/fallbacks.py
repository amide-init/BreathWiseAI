"""Deterministic safe fallback generators used when Gemini fails or fails validation.

Guarantees 100% compliance with deterministic RiskConstraints, city-AQI grounding,
non-preachy harm-reduction (`if_you_continue`), honest freshness labeling, and
medical escalation rules.
"""

from __future__ import annotations

from app.rag.retriever import docs_to_citations
from app.rag.seed_data import KnowledgeDocument
from app.schemas.chat import ChatReply
from app.schemas.common import AqiCategory, FreshnessStatus
from app.schemas.environment import AirQualityResponse
from app.schemas.planner import (
    DailyPlanSections,
    IndoorAssessmentResponse,
    IndoorQuestionnaire,
    RecommendationItem,
    RiskAssessmentResult,
)
from app.schemas.profile import SanitizedContext


def _city_aqi_phrase(env: AirQualityResponse) -> str:
    cur = env.current
    if cur.freshness_status == FreshnessStatus.UNAVAILABLE or cur.aqi is None:
        return f"{env.location_name} (live AQI unavailable)"
    return f"{env.location_name} (AQI {cur.aqi} · {cur.category.value})"


def _evidence_summary(env: AirQualityResponse) -> str:
    cur = env.current
    if cur.freshness_status == FreshnessStatus.UNAVAILABLE or cur.aqi is None:
        return f"Air quality currently unavailable for {env.location_name} (Source: {cur.source})"
    freshness_note = " [CACHED/STALE]" if cur.freshness_status == FreshnessStatus.STALE else ""
    pm25 = next((r.value for r in cur.readings if r.pollutant == "PM2.5"), None)
    pm_part = f", PM2.5 {pm25} µg/m³" if pm25 is not None else ""
    return (
        f"{env.location_name}: CPCB NAQI {cur.aqi} ({cur.category.value})"
        f"{pm_part}{freshness_note} · Source: {cur.source}"
    )


def build_fallback_daily_plan(
    *,
    context: SanitizedContext,
    env: AirQualityResponse,
    risk: RiskAssessmentResult,
    retrieved_docs: list[KnowledgeDocument],
) -> DailyPlanSections:
    """Build a deterministic, city-AQI-grounded, harm-reduction Morning/Afternoon/Evening plan."""
    c = risk.constraints
    city_phrase = _city_aqi_phrase(env)
    evidence = _evidence_summary(env)
    kb_ref = retrieved_docs[0].title if retrieved_docs else "CPCB India Guidelines"
    supporting = f"{evidence}; Guidance: {kb_ref}"

    morning: list[RecommendationItem] = []
    activity = context.exercise_activity_type or "walk"
    if not c.allow_strenuous_outdoor:
        morning.append(
            RecommendationItem(
                item_id="m_exercise",
                title=f"Move your morning {activity} indoors",
                priority="high",
                category="outdoor_activity",
                target_members=["Adults"] + (["Children"] if context.has_children else []),
                what_to_do=f"With {city_phrase}, shift today's morning {activity} indoors instead of heavy outdoor exertion.",
                why=f"Air quality in {city_phrase} pulls fine dust deeper into lungs during brisk outdoor breathing.",
                if_you_continue=(
                    "If you still step outside, keep it to a slow 10–15 minute walk away from "
                    "main roads, wear a snug N95 mask, and head back if your throat feels dry."
                ),
                alternative="Try 20 minutes of indoor stretching, yoga, or home bodyweight exercises.",
                supporting_data=supporting,
            )
        )
    else:
        morning.append(
            RecommendationItem(
                item_id="m_exercise",
                title=f"Enjoy your morning {activity} outside",
                priority="medium",
                category="outdoor_activity",
                target_members=["Household"],
                what_to_do=f"Air in {city_phrase} is comfortable for your morning {activity} today.",
                why=f"Current air quality in {env.location_name} is in the {risk.severity_tier.value} range.",
                if_you_continue="Pick tree-lined lanes away from peak traffic exhaust for cleaner breathing.",
                alternative="Head indoors if haze builds up or anyone feels throat irritation.",
                supporting_data=supporting,
            )
        )

    if context.primary_commute_mode == "two_wheeler":
        commute_action = (
            f"For your {round(context.daily_commute_km)} km ride in {city_phrase}, wear a snug "
            "N95 mask under a closed-visor helmet or take metro/bus when feasible."
        )
        commute_harm = (
            "If you must ride your two-wheeler today, avoid idling right behind diesel buses or "
            "trucks at signals and rinse your face and nose with plain water after arriving."
        )
        commute_alt = "Combine errands into one trip or use public transit on peak-smog days."
    elif context.primary_commute_mode == "personal_car":
        commute_action = (
            f"Keep cabin AC on recirculate mode for your {round(context.daily_commute_km)} km "
            f"drive in {city_phrase}, or carpool to cut roadside emissions."
        )
        commute_harm = (
            "If you drive solo today, keep windows closed in slow traffic and switch AC off "
            "fresh-air intake so exhaust does not enter the cabin."
        )
        commute_alt = "Share the ride with a colleague or shift to metro/WFH once this week."
    else:
        commute_action = f"Keep a snug N95 mask handy for transit stops in {city_phrase}."
        commute_harm = (
            "If you walk near busy roads without a mask, stay on inner lanes away from curb "
            "exhaust and shorten time spent waiting at main-road junctions."
        )
        commute_alt = "Time errands outside rush-hour traffic whenever possible."

    morning.append(
        RecommendationItem(
            item_id="m_commute",
            title="Lower commute smog exposure",
            priority="high" if c.recommend_mask_outdoors else "medium",
            category="commute",
            target_members=["Commuters"] + (["School commute"] if context.has_children else []),
            what_to_do=commute_action,
            why=f"Roadside traffic spikes fine dust well above background levels in {city_phrase}.",
            if_you_continue=commute_harm,
            alternative=commute_alt,
            supporting_data=supporting,
        )
    )

    afternoon: list[RecommendationItem] = []
    if context.has_children or context.has_toddlers:
        if not c.allow_child_outdoor_play:
            afternoon.append(
                RecommendationItem(
                    item_id="a_children",
                    title="Keep kids' afternoon play indoors",
                    priority="high",
                    category="outdoor_activity",
                    target_members=["Children"],
                    what_to_do=f"With {city_phrase}, swap outdoor playground time for active indoor games away from open windows.",
                    why="Children breathe faster per body weight and absorb more fine pollution particles outdoors.",
                    if_you_continue=(
                        "If kids need brief outdoor movement, keep it under 10 minutes in an "
                        "enclosed courtyard away from traffic and offer plenty of water afterward."
                    ),
                    alternative="Set up indoor crafts, board games, or living-room movement games.",
                    supporting_data=supporting,
                )
            )
        else:
            afternoon.append(
                RecommendationItem(
                    item_id="a_children",
                    title="Keep kids' outdoor play watched",
                    priority="medium",
                    category="outdoor_activity",
                    target_members=["Children"],
                    what_to_do=f"Outdoor play is fine in {city_phrase}—take water breaks and check live air if haze picks up.",
                    why="Afternoon traffic or dust can shift local air quality quickly.",
                    if_you_continue="Choose green parks away from main roads for playtime.",
                    alternative="Move games indoors if anyone coughs or air turns hazy.",
                    supporting_data=supporting,
                )
            )

    if context.indoor_equipment.has_hepa_purifier:
        indoor_action = (
            f"Keep windows shut against {city_phrase} and run your HEPA purifier in occupied rooms."
            if c.recommend_windows_closed
            else f"Air in {city_phrase} allows brief cross-ventilation before closing up for evening traffic."
        )
        indoor_harm = (
            "If you open windows briefly for stuffiness, limit it to 10 minutes on the non-road "
            "side and run HEPA on high for 20 minutes right afterward."
        )
    else:
        indoor_action = (
            f"With {city_phrase} and no HEPA purifier, keep road-facing windows closed and seal bottom door gaps."
            if c.recommend_windows_closed
            else f"Open opposite windows briefly in {city_phrase} to clear stale indoor air."
        )
        indoor_harm = (
            "Without a purifier, place a damp rolled towel at main-door gaps, draw thick curtains "
            "on traffic-facing windows, and wet-mop floors so dust stays down."
        )

    afternoon.append(
        RecommendationItem(
            item_id="a_indoor",
            title="Protect indoor air at home",
            priority="high" if c.recommend_windows_closed else "medium",
            category="indoor_air",
            target_members=["Whole family"],
            what_to_do=indoor_action,
            why=f"Blocking smog infiltration from {city_phrase} keeps bedrooms easier to breathe in tonight.",
            if_you_continue=indoor_harm,
            alternative="Wet-mop floors instead of dry sweeping so settled dust does not kick back up.",
            supporting_data=supporting,
        )
    )

    evening: list[RecommendationItem] = [
        RecommendationItem(
            item_id="e_cooking",
            title="Cut evening kitchen & smoke buildup",
            priority="high" if c.recommend_windows_closed else "medium",
            category="cooking_ventilation",
            target_members=["Whole family"],
            what_to_do=(
                f"With {city_phrase}, run your kitchen exhaust while cooking dinner and keep bedroom doors shut."
                if context.indoor_equipment.has_kitchen_exhaust
                else f"With {city_phrase} and no chimney, cover pots while cooking and keep bedroom doors shut from the kitchen."
            ),
            why="Cooking fumes and indoor smoke trap dense PM2.5 indoors when outdoor smog keeps windows closed.",
            if_you_continue=(
                "If frying, burning incense, or smoking happens tonight, keep it strictly near an "
                "open balcony/exhaust with bedroom doors closed and run an outward fan for 15 minutes."
            ),
            alternative="Use lids on pans, lower-smoke cooking methods, or electric appliances when possible.",
            supporting_data=supporting,
        )
    ]

    if c.medical_escalation_required:
        evening.append(
            RecommendationItem(
                item_id="e_medical",
                title="Severe smog: watch symptoms closely",
                priority="high",
                category="health_precaution",
                target_members=["Whole family"],
                what_to_do=(
                    f"With {city_phrase}, follow local health advisories and seek qualified medical "
                    "care or emergency help immediately for wheezing, chest tightness, or shortness of breath."
                ),
                why="Severe pollution strains lungs and heart; an AI assistant cannot diagnose or replace a doctor.",
                if_you_continue="Keep your doctor-prescribed action plan handy and reach out to a clinician early.",
                alternative="Stay indoors in the best-sealed room until official advisories lift.",
                supporting_data=supporting,
            )
        )
    else:
        evening.append(
            RecommendationItem(
                item_id="e_family",
                title="Prep bedroom air before sleep",
                priority="low",
                category="indoor_air",
                target_members=["Whole family"],
                what_to_do=f"Keep sleeping rooms closed against cooler evening smog in {city_phrase} and check morning AQI early.",
                why="Evening temperature drops trap city smoke closer to ground level overnight.",
                if_you_continue=(
                    "If the bedroom feels warm with windows shut, run a ceiling fan with a bowl of "
                    "cool water rather than opening main-road windows overnight."
                ),
                alternative="Log today's commute or indoor protection action in Impact to track your streak.",
                supporting_data=supporting,
            )
        )

    return DailyPlanSections(morning=morning, afternoon=afternoon, evening=evening)


def build_fallback_indoor_assessment(
    *,
    questionnaire: IndoorQuestionnaire,
    env: AirQualityResponse,
    risk: RiskAssessmentResult,
    retrieved_docs: list[KnowledgeDocument],
    agent_trace: list[str] | None = None,
) -> IndoorAssessmentResponse:
    """Deterministic harm-reduction fallback for Module 4 Indoor Air Advisor (estimated only)."""
    city_phrase = _city_aqi_phrase(env)
    evidence = _evidence_summary(env)
    sources: list[str] = []
    recs: list[RecommendationItem] = []

    if questionnaire.indoor_smoking_present:
        sources.append("Indoor tobacco smoke")
        recs.append(
            RecommendationItem(
                item_id="in_smoke",
                title="Keep Tobacco Smoke Out of Living Rooms",
                priority="high",
                category="indoor_air",
                target_members=["Whole family"],
                what_to_do=(
                    f"With {city_phrase}, moving smoking completely outside living and sleeping "
                    "rooms gives the biggest immediate drop in indoor PM2.5."
                ),
                why=(
                    f"Indoor smoke stacks dense toxic PM2.5 on top of {city_phrase} smog and lingers "
                    "in closed rooms for hours."
                ),
                if_you_continue=(
                    "If you still smoke, step onto an open balcony/outdoors with the connecting "
                    "door closed tight, avoid smoking near bedroom vents or children, run an "
                    "exhaust/fan outward for 15–20 minutes afterward, and wash hands before coming back in."
                ),
                alternative="Set up a dedicated outdoor balcony spot away from open windows and doors.",
                supporting_data=f"Questionnaire: indoor smoking present; {evidence}",
            )
        )

    if (
        not questionnaire.uses_kitchen_exhaust
        and questionnaire.cooking_fuel != "electric_induction"
    ):
        sources.append("Unvented gas/solid-fuel cooking emissions")
        recs.append(
            RecommendationItem(
                item_id="in_cooking",
                title="Vent Kitchen Fumes Away From Bedrooms",
                priority="high",
                category="cooking_ventilation",
                target_members=["Whole family"],
                what_to_do=(
                    f"With {city_phrase}, isolate cooking smoke by closing kitchen/bedroom doors "
                    "and venting kitchen air outward while cooking."
                ),
                why="Gas and solid-fuel cooking spike indoor PM2.5 and NO2 inside closed homes.",
                if_you_continue=(
                    "Without a chimney/exhaust fan, cover pots with lids, use back burners on "
                    "medium flame, and point a small table fan out a cracked kitchen window just while cooking."
                ),
                alternative="Shift boiling/reheating to electric kettle or induction when available.",
                supporting_data=f"Questionnaire: {questionnaire.cooking_fuel} without exhaust; {evidence}",
            )
        )

    if questionnaire.incense_or_dhoop_daily:
        sources.append("Daily incense / dhoop combustion")
        recs.append(
            RecommendationItem(
                item_id="in_incense",
                title="Cut Down Indoor Incense & Dhoop Smoke",
                priority="medium",
                category="indoor_air",
                target_members=["Whole family"],
                what_to_do=(
                    f"During {city_phrase}, pause or shorten indoor incense/dhoop burning when "
                    "windows stay closed."
                ),
                why="Incense smoke adds lingering fine particles when outdoor pollution prevents airing out.",
                if_you_continue=(
                    "If daily puja/dhoop is part of your routine, light just 1 short charcoal-free "
                    "stick near an open balcony edge or running exhaust fan, and keep bedroom doors shut for 20 minutes."
                ),
                alternative="Use fresh flowers or smokeless diya/electric options on poor-AQI days.",
                supporting_data=f"Questionnaire: daily incense/dhoop; {evidence}",
            )
        )

    if questionnaire.dust_cleaning_method == "dry_broom":
        sources.append("Dry sweeping resuspending settled dust")
        recs.append(
            RecommendationItem(
                item_id="in_dust",
                title="Trap Settled Floor Dust Instead of Sweeping",
                priority="medium",
                category="indoor_air",
                target_members=["Whole family"],
                what_to_do=(
                    f"With {city_phrase}, use damp mopping instead of dry brooms so settled dust "
                    "does not stay airborne."
                ),
                why="Dry sweeping kicks settled PM10 back up into breathing height inside closed rooms.",
                if_you_continue=(
                    "If sweeping is faster before mopping, sprinkle a few drops of water or wrap "
                    "a barely-damp cloth over the broom, and keep kids/elders out for 15 minutes."
                ),
                alternative="Wipe surfaces with a damp microfiber cloth and wash curtains regularly.",
                supporting_data=f"Questionnaire: dry broom cleaning; {evidence}",
            )
        )

    recs.append(
        RecommendationItem(
            item_id="in_filtration",
            title=(
                "Run HEPA & Seal Smog Gaps"
                if questionnaire.has_hepa_purifier
                else "Zero-Cost Smog Sealing at Home"
            ),
            priority="high" if risk.constraints.recommend_windows_closed else "medium",
            category="indoor_air",
            target_members=["Whole family"],
            what_to_do=(
                f"Keep windows closed against {city_phrase} and run your True-HEPA purifier in the main occupied room."
                if questionnaire.has_hepa_purifier
                else f"With {city_phrase} and no HEPA purifier, keep traffic-facing windows closed and block bottom door gaps."
            ),
            why=f"Outdoor smog from {city_phrase} seeps through loose window frames and balcony doors.",
            if_you_continue=(
                "If rooms feel stuffy without a purifier, tuck a damp towel along door gaps, keep "
                "thick curtains drawn during rush-hour smog, and air out briefly only when live AQI drops."
                if not questionnaire.has_hepa_purifier
                else "If you open a window briefly, close it after 10 minutes and run HEPA on high for 20 minutes."
            ),
            alternative=(
                "Focus filtration on the bedroom overnight where the family spends 7–8 hours."
                if questionnaire.has_hepa_purifier
                else "Create one cleaner-air bedroom by sealing its window gaps with inexpensive rubber tape."
            ),
            supporting_data=evidence,
        )
    )

    risk_level = (
        "high"
        if len(sources) >= 3 or risk.severity_tier in (AqiCategory.VERY_POOR, AqiCategory.SEVERE)
        else "elevated"
        if len(sources) >= 1 or risk.severity_tier == AqiCategory.POOR
        else "moderate"
    )

    return IndoorAssessmentResponse(
        assessment_basis="estimated_questionnaire",
        estimated_risk_level=risk_level,
        key_indoor_sources=sources or [f"Outdoor smog infiltration from {city_phrase}"],
        recommendations=recs,
        citations=docs_to_citations(retrieved_docs),
        agent_trace=list(agent_trace or []),
        fallback_mode=True,
    )


def build_fallback_chat_reply(
    *,
    env: AirQualityResponse,
    risk: RiskAssessmentResult,
    retrieved_docs: list[KnowledgeDocument],
    agent_trace: list[str] | None = None,
) -> ChatReply:
    """Deterministic safe chat reply when Gemini is unavailable or fails safety validation."""
    evidence = _evidence_summary(env)
    parts = [f"Based on verified guidelines and live readings ({evidence}):"]
    parts.append(risk.summary_guidance)

    if risk.constraints.require_freshness_caveat:
        parts.append(
            "Note: Live data is currently stale or unavailable, so please check official local "
            "CPCB advisories before assuming outdoor air is safe."
        )

    if risk.constraints.medical_escalation_required:
        parts.append(
            "Important medical notice: BreatheWise AI cannot diagnose illnesses or recommend "
            "medication dosages. If anyone is experiencing wheezing, chest tightness, shortness "
            "of breath, or worsening symptoms, please seek qualified medical care or local "
            "emergency services promptly."
        )

    return ChatReply(
        content="\n\n".join(parts),
        follow_up_suggestions=[
            "How can I cut indoor smoke without an air purifier?",
            "What if I still have to commute on a two-wheeler today?",
            "Show today's personalized Daily Plan",
        ],
        citations=docs_to_citations(retrieved_docs),
        environmental_snapshot=env.current,
        agent_trace=list(agent_trace or []),
        medical_disclaimer_shown=True,
        fallback_mode=True,
    )
