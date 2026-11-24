"""Domain constants: CPCB NAQI breakpoints, emission factors, safety keywords, fallback cities.

Sources documented in `docs/AI_WORKFLOW.md` and `docs/IMPACT_AND_KNOWLEDGE.md`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

# ---------------------------------------------------------------------------
# India CPCB National Air Quality Index (NAQI) 24-hr Breakpoints
# Each tuple: (concentration_low, concentration_high, index_low, index_high)
# ---------------------------------------------------------------------------
CPCB_PM25_BREAKPOINTS: Final[tuple[tuple[float, float, int, int], ...]] = (
    (0.0, 30.0, 0, 50),
    (30.0, 60.0, 51, 100),
    (60.0, 90.0, 101, 200),
    (90.0, 120.0, 201, 300),
    (120.0, 250.0, 301, 400),
    (250.0, 500.0, 401, 500),
)

CPCB_PM10_BREAKPOINTS: Final[tuple[tuple[float, float, int, int], ...]] = (
    (0.0, 50.0, 0, 50),
    (50.0, 100.0, 51, 100),
    (100.0, 250.0, 101, 200),
    (250.0, 350.0, 201, 300),
    (350.0, 430.0, 301, 400),
    (430.0, 600.0, 401, 500),
)

CPCB_CATEGORY_GUIDANCE: Final[dict[str, str]] = {
    "Good": "Air quality is Good. Outdoor activities and natural home ventilation are suitable for everyone.",
    "Satisfactory": "Air quality is Satisfactory. Most people can enjoy normal outdoor activities; unusually sensitive individuals should monitor how they feel.",
    "Moderate": "Air quality is Moderate. Sensitive groups (children, elderly, and people with respiratory or heart sensitivities) should pace prolonged outdoor exertion.",
    "Poor": "Air quality is Poor. Reduce prolonged or strenuous outdoor exercise, consider indoor alternatives for children, and keep windows closed during peak pollution.",
    "Very Poor": "Air quality is Very Poor. Avoid strenuous outdoor exercise, minimize unnecessary outdoor exposure, use HEPA filtration indoors if available, and follow local health advisories.",
    "Severe": "Air quality is Severe. Avoid outdoor physical activity, keep children and sensitive family members indoors with clean filtered air, wear a well-fitted N95/equivalent mask if going outside is unavoidable, and follow official public-health advisories.",
    "Unavailable": "Live air-quality readings are currently unavailable for this station. Avoid assuming air quality is safe and check official local advisories before strenuous outdoor activity.",
}

# ---------------------------------------------------------------------------
# Medical Escalation Symptom Keywords (PRD §7.4)
# ---------------------------------------------------------------------------
ACUTE_SYMPTOM_KEYWORDS: Final[tuple[str, ...]] = (
    "wheezing",
    "asthma attack",
    "chest pain",
    "chest tightness",
    "shortness of breath",
    "trouble breathing",
    "difficulty breathing",
    "can't breathe",
    "cannot breathe",
    "dizzy",
    "fainting",
    "inhaler dosage",
    "prescribe",
    "diagnose",
)

# ---------------------------------------------------------------------------
# Sustainability Emission Factors (docs/IMPACT_AND_KNOWLEDGE.md)
# ---------------------------------------------------------------------------
EMISSION_FACTOR_SOURCE: Final[str] = (
    "UK DESNZ/DEFRA GHG Conversion Factors & India GHG Program mid-range transport benchmarks (Estimate)"
)
INDIA_GRID_EMISSION_FACTOR_KG_PER_KWH: Final[float] = 0.71
INDIA_GRID_FACTOR_SOURCE: Final[str] = (
    "India CEA weighted average electricity grid factor ~0.71 kg CO2e/kWh (Estimate)"
)


@dataclass(frozen=True, slots=True)
class TransportEmissionFactor:
    """Reference emission factor for a transport mode."""

    mode_key: str
    label: str
    kg_co2e_per_km: float
    per_passenger: bool
    default_occupancy: int = 1


TRANSPORT_EMISSION_FACTORS: Final[dict[str, TransportEmissionFactor]] = {
    "petrol_car_solo": TransportEmissionFactor("petrol_car_solo", "Petrol Car", 0.170, False, 1),
    "diesel_car_solo": TransportEmissionFactor("diesel_car_solo", "Diesel Car", 0.168, False, 1),
    "cng_car_solo": TransportEmissionFactor("cng_car_solo", "CNG Car", 0.120, False, 1),
    "ev_car": TransportEmissionFactor("ev_car", "Electric Car (India grid avg)", 0.095, False, 1),
    "two_wheeler_petrol": TransportEmissionFactor(
        "two_wheeler_petrol", "Petrol Two-Wheeler", 0.065, False, 1
    ),
    "bus_transit": TransportEmissionFactor(
        "bus_transit", "City Bus (Public Transit)", 0.080, True, 1
    ),
    "metro_rail": TransportEmissionFactor("metro_rail", "Metro / Urban Rail", 0.035, True, 1),
    "walk_cycle": TransportEmissionFactor("walk_cycle", "Walking / Cycling", 0.000, True, 1),
    "wfh": TransportEmissionFactor("wfh", "Work From Home (Avoided Commute)", 0.000, True, 1),
}

# ---------------------------------------------------------------------------
# Curated Fallback Cities (used when Google Maps geocoding is unavailable)
# ---------------------------------------------------------------------------
CURATED_INDIAN_CITIES: Final[tuple[dict[str, object], ...]] = (
    {
        "locationId": "in-new-delhi-28.61-77.21",
        "city": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "label": "New Delhi, Delhi, India",
        "lat": 28.6139,
        "lng": 77.2090,
    },
    {
        "locationId": "in-gurugram-28.46-77.03",
        "city": "Gurugram",
        "state": "Haryana",
        "country": "India",
        "label": "Gurugram, Haryana, India",
        "lat": 28.4595,
        "lng": 77.0266,
    },
    {
        "locationId": "in-noida-28.54-77.39",
        "city": "Noida",
        "state": "Uttar Pradesh",
        "country": "India",
        "label": "Noida, Uttar Pradesh, India",
        "lat": 28.5355,
        "lng": 77.3910,
    },
    {
        "locationId": "in-mumbai-19.08-72.88",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "label": "Mumbai, Maharashtra, India",
        "lat": 19.0760,
        "lng": 72.8777,
    },
    {
        "locationId": "in-bengaluru-12.97-77.59",
        "city": "Bengaluru",
        "state": "Karnataka",
        "country": "India",
        "label": "Bengaluru, Karnataka, India",
        "lat": 12.9716,
        "lng": 77.5946,
    },
    {
        "locationId": "in-kolkata-22.57-88.36",
        "city": "Kolkata",
        "state": "West Bengal",
        "country": "India",
        "label": "Kolkata, West Bengal, India",
        "lat": 22.5726,
        "lng": 88.3639,
    },
    {
        "locationId": "in-lucknow-26.85-80.95",
        "city": "Lucknow",
        "state": "Uttar Pradesh",
        "country": "India",
        "label": "Lucknow, Uttar Pradesh, India",
        "lat": 26.8467,
        "lng": 80.9462,
    },
    {
        "locationId": "in-hyderabad-17.39-78.49",
        "city": "Hyderabad",
        "state": "Telangana",
        "country": "India",
        "label": "Hyderabad, Telangana, India",
        "lat": 17.3850,
        "lng": 78.4867,
    },
)
