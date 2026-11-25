"""Verified environmental and public-health RAG knowledge documents (docs/IMPACT_AND_KNOWLEDGE.md).

Authoritative general guidance only — never diagnostic or prescriptive medical advice.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final


@dataclass(frozen=True, slots=True)
class KnowledgeDocument:
    """Verified knowledge chunk used for RAG grounding in Node 4."""

    doc_id: str
    title: str
    topic: str
    applicable_risk_tiers: tuple[str, ...]
    content: str
    source_authority: str
    source_url: str
    version: str = "1.0"


VERIFIED_KNOWLEDGE_DOCS: Final[tuple[KnowledgeDocument, ...]] = (
    KnowledgeDocument(
        doc_id="cpcb-naqi-categories-v1",
        title="CPCB National Air Quality Index (NAQI) Categories",
        topic="aqi_health",
        applicable_risk_tiers=("All",),
        content=(
            "India's Central Pollution Control Board (CPCB) NAQI classifies air quality into six "
            "categories: Good (0-50, minimal impact), Satisfactory (51-100, minor breathing "
            "discomfort to sensitive people), Moderate (101-200, discomfort to people with lung, "
            "asthma, or heart sensitivities), Poor (201-300, breathing discomfort to most people "
            "on prolonged exposure), Very Poor (301-400, respiratory illness risk on prolonged "
            "exposure), and Severe (401-500, affects healthy people and seriously impacts those "
            "with existing respiratory or cardiac sensitivities)."
        ),
        source_authority="CPCB India",
        source_url="https://cpcb.nic.in/",
    ),
    KnowledgeDocument(
        doc_id="who-pm25-pm10-basics-v1",
        title="Understanding PM2.5 and PM10 Particulate Exposure",
        topic="aqi_health",
        applicable_risk_tiers=("All",),
        content=(
            "PM10 refers to inhalable particles up to 10 micrometers in diameter, such as road "
            "dust and construction debris. PM2.5 refers to fine particles up to 2.5 micrometers "
            "produced by combustion, vehicle exhaust, biomass burning, and winter smog inversions. "
            "Because PM2.5 is small enough to penetrate deep into airways, reducing vigorous outdoor "
            "breathing during high PM2.5 periods significantly lowers inhaled particulate dose."
        ),
        source_authority="WHO Air Quality Guidelines",
        source_url="https://www.who.int/health-topics/air-pollution",
    ),
    KnowledgeDocument(
        doc_id="children-school-outdoor-v1",
        title="Protecting Children During Elevated Air Pollution",
        topic="children_elderly",
        applicable_risk_tiers=("Moderate", "Poor", "Very Poor", "Severe"),
        content=(
            "Children breathe faster per unit of body weight and spend more time active outdoors, "
            "making them more sensitive to elevated particulate pollution. When CPCB NAQI reaches "
            "Poor (201+) or higher, shift active outdoor play indoors, avoid outdoor sports drills, "
            "limit waiting beside idling traffic during school drop-off/pick-up, and follow school "
            "or local public-health advisories."
        ),
        source_authority="WHO / CPCB India",
        source_url="https://www.who.int/health-topics/air-pollution",
    ),
    KnowledgeDocument(
        doc_id="elderly-sensitive-groups-v1",
        title="Precautions for Older Adults and Sensitive Groups",
        topic="children_elderly",
        applicable_risk_tiers=("Moderate", "Poor", "Very Poor", "Severe"),
        content=(
            "Older adults (60+) and individuals with respiratory or cardiovascular sensitivities "
            "should take conservative precautions starting at Moderate AQI (101-200) by shortening "
            "prolonged outdoor exertion. During Poor, Very Poor, or Severe AQI, remain indoors in "
            "clean filtered air, avoid early-morning smog peaks, and follow clinician-provided "
            "action plans."
        ),
        source_authority="WHO / US EPA",
        source_url="https://www.airnow.gov/",
    ),
    KnowledgeDocument(
        doc_id="outdoor-exercise-smog-v1",
        title="Outdoor Exercise and Smog Exposure",
        topic="aqi_health",
        applicable_risk_tiers=("Moderate", "Poor", "Very Poor", "Severe"),
        content=(
            "Vigorous exercise increases breathing volume several-fold, pulling significantly more "
            "PM2.5 deep into the lungs. When AQI is Poor (201+) or higher, replace outdoor running "
            "or brisk walks with indoor workouts such as yoga, bodyweight routines, or stretching "
            "in a clean-air room. Never assume early morning is cleaner during winter inversions "
            "without checking live readings."
        ),
        source_authority="US EPA / WHO",
        source_url="https://www.airnow.gov/",
    ),
    KnowledgeDocument(
        doc_id="indoor-infiltration-ventilation-v1",
        title="Managing Outdoor Smog Infiltration and Home Ventilation",
        topic="indoor_air",
        applicable_risk_tiers=("Poor", "Very Poor", "Severe"),
        content=(
            "During Poor, Very Poor, or Severe outdoor pollution, keep exterior windows and doors "
            "closed and seal obvious gaps around frames to reduce smog infiltration. Avoid wide "
            "cross-ventilation while outdoor AQI is elevated; ventilate naturally only when live "
            "outdoor AQI drops to Good or Satisfactory levels."
        ),
        source_authority="US EPA Indoor Air Quality",
        source_url="https://www.epa.gov/indoor-air-quality-iaq",
    ),
    KnowledgeDocument(
        doc_id="hepa-purifier-guidance-v1",
        title="Effective Use of True-HEPA Air Purifiers Indoors",
        topic="hepa_filtration",
        applicable_risk_tiers=("Moderate", "Poor", "Very Poor", "Severe"),
        content=(
            "A portable air cleaner with a certified True-HEPA filter sized to the room's Clean "
            "Air Delivery Rate (CADR) effectively reduces indoor PM2.5 when windows are closed. "
            "Place the purifier away from corners or curtains for unobstructed airflow, prioritize "
            "bedrooms and main family rooms, replace filters on schedule, and avoid ozone-producing "
            "ionizers."
        ),
        source_authority="US EPA Indoor Air Quality",
        source_url="https://www.epa.gov/indoor-air-quality-iaq/air-cleaners-and-air-filters-home",
    ),
    KnowledgeDocument(
        doc_id="indoor-cooking-combustion-v1",
        title="Reducing Indoor Cooking, Incense, and Dust Pollution",
        topic="cooking_ventilation",
        applicable_risk_tiers=("All",),
        content=(
            "Gas stoves, frying, indoor smoking, incense sticks (agarbatti/dhoop), and candles "
            "can generate sharp indoor PM2.5 spikes, especially when windows stay closed for smog. "
            "Always run a kitchen exhaust fan or chimney while cooking, avoid indoor smoking and "
            "unnecessary combustion, and use wet mopping or a HEPA-filtered vacuum instead of dry "
            "sweeping that resuspends settled dust."
        ),
        source_authority="WHO / US EPA Indoor Air Quality",
        source_url="https://www.epa.gov/indoor-air-quality-iaq",
    ),
    KnowledgeDocument(
        doc_id="particulate-mask-guidance-v1",
        title="Particulate Respirator (N95 / KN95 / FFP2) Guidance",
        topic="masks",
        applicable_risk_tiers=("Poor", "Very Poor", "Severe"),
        content=(
            "Cloth and loose surgical masks provide limited filtration against fine PM2.5 particles. "
            "When outdoor exposure during Poor, Very Poor, or Severe pollution is unavoidable, a "
            "well-fitted N95, KN95, or FFP2 particulate respirator helps reduce inhaled particles. "
            "Check for a snug nose-bridge seal and follow manufacturer guidance for child sizing."
        ),
        source_authority="CDC / NIOSH / CPCB",
        source_url="https://www.cdc.gov/niosh/",
    ),
    KnowledgeDocument(
        doc_id="commute-emissions-alternatives-v1",
        title="Lower-Emission Daily Commuting Alternatives",
        topic="commute_sustainability",
        applicable_risk_tiers=("All",),
        content=(
            "Personal petrol and diesel car commutes are a major contributor to urban PM2.5, NO2, "
            "and CO2 emissions. Practical household alternatives include carpooling with colleagues "
            "(cutting per-passenger emissions by 50-67%), switching to metro or bus transit, "
            "combining errands into single trips, avoiding engine idling outside schools, working "
            "from home when permitted, and choosing walking or cycling when AQI is Good or Satisfactory."
        ),
        source_authority="India GHG Program / UNEP",
        source_url="https://www.unep.org/",
    ),
    KnowledgeDocument(
        doc_id="medical-escalation-safety-v1",
        title="When to Seek Qualified Medical Care During Severe Smog",
        topic="medical_escalation",
        applicable_risk_tiers=("Very Poor", "Severe", "All"),
        content=(
            "Environmental assistants cannot diagnose medical conditions or recommend medication "
            "dosages. If anyone in the household experiences wheezing, persistent shortness of "
            "breath, chest tightness or pain, dizziness, or worsening respiratory symptoms, seek "
            "prompt evaluation from a qualified healthcare professional or local emergency services "
            "and follow official public-health advisories."
        ),
        source_authority="WHO / Public Health Guidance",
        source_url="https://www.who.int/health-topics/air-pollution",
    ),
)
