"""Deterministic safe fallback generators used when Gemini fails or fails validation.

Guarantees 100% compliance with deterministic RiskConstraints, PRD 4-part
recommendation format, honest freshness labeling, and medical escalation rules.
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


def _evidence_summary(env: AirQualityResponse) -> str:
    cur = env.current
    if cur.freshness_status == FreshnessStatus.UNAVAILABLE or cur.aqi is None:
        return f"Air quality currently unavailable for {env.location_name} (Source: {cur.source})"
    freshness_note = " [CACHED/STALE]" if cur.freshness_status == FreshnessStatus.STALE else ""
    pm25 = next((r.value for r in cur.readings if r.pollutant == "PM2.5"), None)
    pm_part = f", PM2.5 {pm25} µg/m³" if pm25 is not None else ""
    return f"CPCB NAQI {cur.aqi} ({cur.category.value}){pm_part}{freshness_note} · Source: {cur.source}"


def build_fallback_daily_plan(
    *,
    context: SanitizedContext,
    env: AirQualityResponse,
    risk: RiskAssessmentResult,
    retrieved_docs: list[KnowledgeDocument],
) -> DailyPlanSections:
    """Build a deterministic, constraint-compliant Morning/Afternoon/Evening plan."""
    c = risk.constraints
    evidence = _evidence_summary(env)
    kb_ref = retrieved_docs[0].title if retrieved_docs else "CPCB India Guidelines"
    supporting = f"{evidence}; Guidance: {kb_ref}"

    # Morning items
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
                what_to_do=f"Skip the outdoor {activity} today and do a light workout inside instead.",
                why=f"Air quality is {risk.severity_tier.value}, and heavy outdoor breathing pulls extra fine dust deep into lungs.",
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
                what_to_do=f"Outdoor air looks good for your morning {activity} today.",
                why=f"Current air quality is in the {risk.severity_tier.value} range.",
                alternative="Head indoors if the air turns hazy or anyone feels throat irritation.",
                supporting_data=supporting,
            )
        )

    # Commute / Sustainability item
    if context.primary_commute_mode in ("personal_car", "two_wheeler"):
        commute_action = (
            f"Carpool or take metro/bus for today's {round(context.daily_commute_km)} km commute."
        )
        commute_alt = "Combine errands into one trip or work from home if you can."
    else:
        commute_action = "Keep vehicle windows shut in heavy traffic during your commute."
        commute_alt = "Wear a snug N95 mask while walking to transit stops."

    if c.recommend_mask_outdoors:
        commute_action += " Wear a snug N95/KN95 mask outdoors."

    morning.append(
        RecommendationItem(
            item_id="m_commute",
            title="Switch to a cleaner commute",
            priority="high" if c.recommend_mask_outdoors else "medium",
            category="commute",
            target_members=["Commuters"] + (["School commute"] if context.has_children else []),
            what_to_do=commute_action,
            why="Fewer solo trips cut roadside exhaust and reduce what you breathe in traffic.",
            alternative=commute_alt,
            supporting_data=supporting,
        )
    )

    # Afternoon items
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
                    what_to_do="Swap park or playground time for indoor games away from open windows.",
                    why="Children breathe faster than adults and absorb more tiny dust particles outside.",
                    alternative="Set up indoor crafts, board games, reading, or active living-room play.",
                    supporting_data=supporting,
                )
            )
        else:
            afternoon.append(
                RecommendationItem(
                    item_id="a_children",
                    title="Keep kids' outdoor play short & watched",
                    priority="medium",
                    category="outdoor_activity",
                    target_members=["Children"],
                    what_to_do="Outdoor play is fine—take water breaks and check live air before going out.",
                    why="Afternoon traffic or dust can change local air quickly.",
                    alternative="Move games indoors if haze builds up.",
                    supporting_data=supporting,
                )
            )

    hepa_text = (
        "Keep windows closed and run your HEPA air purifier in occupied rooms."
        if context.indoor_equipment.has_hepa_purifier
        else "Keep windows and exterior doors closed to block outside smog."
    )
    afternoon.append(
        RecommendationItem(
            item_id="a_indoor",
            title="Keep your home air clean",
            priority="high" if c.recommend_windows_closed else "medium",
            category="indoor_air",
            target_members=["Whole family"],
            what_to_do=(
                hepa_text
                if c.recommend_windows_closed
                else "Open opposite windows briefly to bring fresh air through your home."
            ),
            why="Blocking outdoor haze and indoor dust keeps bedrooms easier to breathe in.",
            alternative="Wet-mop floors instead of dry sweeping so dust does not kick back up.",
            supporting_data=supporting,
        )
    )

    # Evening items
    evening: list[RecommendationItem] = [
        RecommendationItem(
            item_id="e_cooking",
            title="Run exhaust & skip indoor smoke",
            priority="high" if c.recommend_windows_closed else "medium",
            category="cooking_ventilation",
            target_members=["Whole family"],
            what_to_do="Switch on your kitchen exhaust while cooking dinner and skip incense or candles tonight.",
            why="Cooking fumes and incense trap tiny smoke particles indoors when windows stay closed.",
            alternative="Cover pots with lids and keep bedroom doors shut while cooking.",
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
                    "Follow local health advisories. Seek qualified medical care or emergency help "
                    "right away for wheezing, chest tightness, or trouble breathing."
                ),
                why="Severe pollution puts extra strain on lungs and heart; an AI app cannot replace a doctor.",
                alternative="Keep any doctor-prescribed action plan handy and check in with your clinician early.",
                supporting_data=supporting,
            )
        )
    else:
        evening.append(
            RecommendationItem(
                item_id="e_family",
                title="Unwind indoors & prep for tomorrow",
                priority="low",
                category="indoor_air",
                target_members=["Whole family"],
                what_to_do="Enjoy a calm evening indoors and glance at morning air before school or office runs.",
                why="Cooler evening air traps city smoke closer to the ground.",
                alternative="Log today's carpool or indoor swap in My Impact to track your streak.",
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
) -> IndoorAssessmentResponse:
    """Deterministic fallback for Module 4 Indoor Air Quality Advisor (estimated only)."""
    evidence = _evidence_summary(env)
    sources: list[str] = []
    recs: list[RecommendationItem] = []

    if questionnaire.indoor_smoking_present:
        sources.append("Indoor tobacco smoke")
        recs.append(
            RecommendationItem(
                item_id="in_smoke",
                title="Eliminate Indoor Smoking",
                priority="high",
                category="indoor_air",
                target_members=["Whole family"],
                what_to_do="Make all indoor rooms completely smoke-free, especially bedrooms and living spaces.",
                why="Indoor tobacco smoke creates high concentrations of persistent PM2.5 and toxic gases.",
                alternative="Restrict smoking strictly outdoors far away from open doors and windows.",
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
                title="Ventilate Kitchen During Cooking",
                priority="high",
                category="cooking_ventilation",
                target_members=["Whole family"],
                what_to_do="Run a kitchen exhaust or chimney while cooking and keep kitchen doors closed from sleeping areas.",
                why="Cooking on gas or solid fuel emits fine particulates and NO2 indoors.",
                alternative="Cover pots, reduce high-heat frying, or use electric kettle/induction where available.",
                supporting_data=f"Questionnaire: {questionnaire.cooking_fuel} without exhaust; {evidence}",
            )
        )

    if questionnaire.incense_or_dhoop_daily:
        sources.append("Daily incense / dhoop combustion")
        recs.append(
            RecommendationItem(
                item_id="in_incense",
                title="Reduce Indoor Incense & Dhoop Burning",
                priority="medium",
                category="indoor_air",
                target_members=["Whole family"],
                what_to_do="Avoid or pause burning incense, dhoop, and scented candles indoors during smog days.",
                why="Incense smoke adds indoor PM2.5 when outdoor pollution prevents opening windows.",
                alternative="Use fresh flowers or smokeless alternatives during poor outdoor air quality.",
                supporting_data=f"Questionnaire: daily incense/dhoop; {evidence}",
            )
        )

    if questionnaire.dust_cleaning_method == "dry_broom":
        sources.append("Dry sweeping resuspending settled dust")
        recs.append(
            RecommendationItem(
                item_id="in_dust",
                title="Switch from Dry Sweeping to Wet Mopping",
                priority="medium",
                category="indoor_air",
                target_members=["Whole family"],
                what_to_do="Use damp mopping or a HEPA-filtered vacuum instead of dry brooms.",
                why="Dry sweeping kicks settled PM10 and coarse dust back into breathable indoor air.",
                alternative="Wipe surfaces with a damp microfiber cloth and wash curtains/bedding regularly.",
                supporting_data=f"Questionnaire: dry broom cleaning; {evidence}",
            )
        )

    recs.append(
        RecommendationItem(
            item_id="in_filtration",
            title="Manage Filtration & Outdoor Infiltration",
            priority="high" if risk.constraints.recommend_windows_closed else "medium",
            category="indoor_air",
            target_members=["Whole family"],
            what_to_do=(
                "Keep windows sealed during high outdoor AQI and run a properly sized True-HEPA purifier in occupied rooms."
                if questionnaire.has_hepa_purifier
                else "Keep exterior windows closed during smog spikes, seal obvious door drafts, and ventilate only when live outdoor AQI improves."
            ),
            why="Outdoor PM2.5 infiltrates homes through window gaps when outdoor AQI is elevated.",
            alternative="Consider a certified True-HEPA air purifier (avoid ozone ionizers) sized for the primary bedroom.",
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
        key_indoor_sources=sources or ["Outdoor smog infiltration during elevated AQI"],
        recommendations=recs,
        citations=docs_to_citations(retrieved_docs),
        fallback_mode=True,
    )


def build_fallback_chat_reply(
    *,
    env: AirQualityResponse,
    risk: RiskAssessmentResult,
    retrieved_docs: list[KnowledgeDocument],
) -> ChatReply:
    """Deterministic safe chat reply when Gemini is unavailable or fails safety validation."""
    evidence = _evidence_summary(env)
    parts = [f"Based on verified guidelines and current environmental context ({evidence}):"]
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
            "How can I improve indoor air quality today?",
            "What commute alternatives reduce emissions?",
            "Show today's personalized Daily Plan",
        ],
        citations=docs_to_citations(retrieved_docs),
        environmental_snapshot=env.current,
        medical_disclaimer_shown=True,
        fallback_mode=True,
    )
