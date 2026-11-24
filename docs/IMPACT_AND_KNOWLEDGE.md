# Sustainability Impact Formulas & Verified Knowledge Base — BreatheWise AI

> Derived from [PRD.md](../PRD.md) §6 (Modules 4, 5, 6), §7.3, and §16. Provides the transparent deterministic formulas for environmental impact estimation and the curated seed blueprint for the `knowledge_base/` Firestore RAG collection.

---

## 1. Sustainability & Impact Calculation Methodology

> [!IMPORTANT]
> **Hard Product Rule (PRD §6 Module 5)**:
> 1. **Personal exposure reduction** and **environmental emissions reduction** MUST be tracked, calculated, and displayed separately.
> 2. Every emissions metric MUST be explicitly labeled as an **Estimate** and expose its formula, user inputs, and emission factor reference.

### 1.1 Commute CO2 Emissions Avoided Formula

For a logged commute substitution on a round-trip or one-way distance $d$ (in km):

$$\text{CO}_2\text{ Avoided (kg)} = \max\left(0,\; d \times \left(\frac{\text{EF}_{\text{baseline}}}{\text{occ}_{\text{baseline}}} - \frac{\text{EF}_{\text{alternative}}}{\text{occ}_{\text{alternative}}}\right)\right)$$

Where:
- $d$ = commute distance in kilometers (`distanceKm`, user-supplied or from Family Profile).
- $\text{EF}_{\text{mode}}$ = vehicle tailpipe/lifecycle emission factor in `kg CO2e / vehicle-km` (or per passenger-km for public transit).
- $\text{occ}$ = vehicle occupancy (`1` for solo commute; user-supplied for carpool, e.g., `3` when carpooling with 2 colleagues).

### 1.2 Default Emission Factors Table (MVP Reference)

All defaults are documented mid-range estimates derived from UK DESNZ / DEFRA GHG Conversion Factors & India Greenhouse Gas Program transport benchmarks (rounded for transparent hackathon communication):

| Mode Key | Display Label | Emission Factor | Unit | Default Occupancy |
|---|---|---|---|---|
| `petrol_car_solo` | Petrol Car | `0.170` | `kg CO2e / vehicle-km` | `1` |
| `diesel_car_solo` | Diesel Car | `0.168` | `kg CO2e / vehicle-km` | `1` |
| `cng_car_solo` | CNG Car | `0.120` | `kg CO2e / vehicle-km` | `1` |
| `ev_car` | Electric Car (India grid avg) | `0.095` | `kg CO2e / vehicle-km` | `1` |
| `two_wheeler_petrol` | Petrol Two-Wheeler | `0.065` | `kg CO2e / vehicle-km` | `1` |
| `bus_transit` | City Bus (Public Transit) | `0.080` | `kg CO2e / passenger-km` | `1` (already per passenger) |
| `metro_rail` | Metro / Urban Rail | `0.035` | `kg CO2e / passenger-km` | `1` (already per passenger) |
| `walk_cycle` | Walking / Cycling | `0.000` | `kg CO2e / passenger-km` | `1` |
| `wfh` | Work From Home (avoided commute) | `0.000` | `kg CO2e / km` (commute only) | `1` |

#### Worked Example (PRD §6 Module 5 & §15 Demo)
- **Baseline**: Solo petrol car commute, `20 km` round-trip (`0.170 kg/km`, occupancy `1`) → `3.40 kg CO2e`.
- **Alternative**: Carpool with 2 colleagues (`occupancy = 3`) → `20 × (0.170 / 3) = 1.13 kg CO2e` per passenger.
- **Estimated CO2 Avoided**: `3.40 - 1.13 = 2.27 kg CO2e` (displayed with assumptions: *"20 km petrol car trip shared by 3 occupants; DEFRA/India GHG mid-range factor 0.170 kg CO2e/km; estimate only"*).

### 1.3 Energy-Saving Actions (Optional Emissions Actions)

For simple household electricity savings logged by users (e.g., turning off idle appliances / raising AC setpoint / line-drying):
- Uses India CEA weighted average grid emission factor: `0.71 kg CO2e / kWh` (approximate, clearly marked as an estimate).
- Only applied when the user selects a bounded predefined action with an explicit estimated `kWh` assumption (e.g., *"Avoided 1 hour of 1.5 kW space heater / AC runtime ≈ 1.07 kg CO2e estimated"*).

### 1.4 Exposure-Protection Actions (Separate Metric — Zero CO2 Claimed)

Actions tracked solely under `impactDomain: "exposure_reduction"`:
- `indoor_exercise_swap` — Replaced high-AQI outdoor exercise with indoor alternative.
- `hepa_purifier_use` — Operated HEPA filtration during `Poor` / `Very Poor` / `Severe` hours.
- `n95_mask_used` — Wore well-fitted particulate respirator during unavoidable high-AQI commute.
- `reduced_outdoor_exposure` — Shifted child play or errands indoors during peak pollution.

These increment `exposureProtection.actionsCount` and `highAqiActionsAvoided` ONLY (`estimatedCo2AvoidedKg` MUST remain `null`).

---

## 2. Verified Knowledge Base (`knowledge_base/`) Seed Blueprint

To ground Node 4 (`recommendation_agent`) via RAG without inventing medical or environmental claims, seed Firestore `knowledge_base/` with concise, authoritative documents during Day 4/6 via `functions/scripts/seed_knowledge_base.py`.

### Planned Seed Documents (10 Core Documents for MVP)

| `docId` | Topic | Applicable Risk Tiers | Authority | Key Grounded Guidance Covered |
|---|---|---|---|---|
| `cpcb-naqi-categories-v1` | `aqi_health` | `All` | CPCB India | Official 6 CPCB NAQI categories (Good 0–50 through Severe 401–500) and standard public-health impact descriptions. |
| `who-pm25-pm10-basics-v1` | `aqi_health` | `All` | WHO Air Quality Guidelines | Plain-language explanation of PM2.5 vs. PM10, why fine particulates penetrate deep into airways, and general exposure minimization. |
| `children-school-outdoor-v1` | `children_elderly` | `Moderate`, `Poor`, `Very Poor`, `Severe` | WHO / CPCB / EPA | Why children breathe faster per body weight; shifting outdoor play indoors during Poor–Severe AQI; school commute precautions. |
| `elderly-sensitive-groups-v1` | `children_elderly` | `Moderate`, `Poor`, `Very Poor`, `Severe` | WHO / US EPA | Conservative guidance for older adults and individuals with respiratory/cardiac sensitivities; avoiding strenuous exertion earlier at Moderate/Poor tiers. |
| `outdoor-exercise-smog-v1` | `aqi_health` | `Moderate`, `Poor`, `Very Poor`, `Severe` | US EPA / WHO | Why vigorous outdoor exercise increases inhaled particulate dose; switching to indoor low-emission workouts during elevated AQI. |
| `indoor-infiltration-ventilation-v1` | `indoor_air` | `Poor`, `Very Poor`, `Severe` | US EPA Indoor Air Quality | Keeping windows/doors sealed during severe outdoor smog spikes; ventilating selectively only when outdoor AQI improves. |
| `hepa-purifier-guidance-v1` | `hepa_filtration` | `Poor`, `Very Poor`, `Severe` | US EPA Indoor Air Quality | Sizing a true-HEPA purifier (CADR matching room size), placing away from corners, avoiding ozone-generating ionizers, keeping filters maintained. |
| `indoor-cooking-combustion-v1` | `cooking_ventilation` | `All` | WHO / US EPA | Using kitchen exhaust fans when cooking on gas/stoves; avoiding indoor smoking, unnecessary incense/dhoop/candles, and dry sweeping (prefer wet mopping/HEPA vacuum). |
| `particulate-mask-guidance-v1` | `masks` | `Poor`, `Very Poor`, `Severe` | CDC / NIOSH / CPCB | Difference between cloth/surgical masks and well-fitted N95/KN95/FFP2 particulate respirators for PM2.5; fit matters; general comfort/safety caveats for very young children. |
| `commute-emissions-alternatives-v1` | `commute_sustainability` | `All` | India GHG Program / UNEP | Practical household ways to cut local urban emissions: carpooling, public transit, combining errands, avoiding vehicle idling, and active transport when AQI permits. |
| `medical-escalation-safety-v1` | `medical_escalation` | `Very Poor`, `Severe`, `All` | WHO / Public Health General | Non-diagnostic safety boundaries: when to seek prompt medical attention (wheezing, chest tightness, persistent shortness of breath, worsening symptoms) and following local emergency advisories. |

### Retrieval Rules for MVP
- Use deterministic metadata filtering (`applicableRiskTiers` + inferred `topic` tags from `workflow_mode` and `user_query`) combined with lightweight keyword scoring (or Firestore vector search if enabled later) to fetch the top 3–5 chunks in `< 100ms` with zero external vector-DB infrastructure overhead.
- Every retrieved chunk passed to Gemini MUST include its `docId`, `title`, and `sourceAuthority` so Node 4 can emit verifiable `citations`.
