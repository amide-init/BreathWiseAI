---
trigger: always_on
---

# AI Safety, Grounding & Environmental Data Integrity Rules

These guardrails are mandatory across all prompts, LangGraph nodes, backend endpoints, frontend components, and tests in BreatheWise AI (derived from [PRD.md](../../PRD.md) §6, §7.4, §9, and §12).

## 1. Zero Fabricated Environmental Data

- **Never invent readings**: Never generate, estimate, or fill in AQI, PM2.5, PM10, temperature, humidity, or wind measurements when an external API fails or returns partial data.
- **Never fabricate safe time windows**: Never recommend a specific time window (e.g., *"jog between 2–4 PM"*) unless actual hourly forecast data for that exact location and time window supports lower pollution.
- **Explicit freshness on every reading**: Every environmental payload MUST carry `observed_at`, `source`, and `freshness_status` (`fresh` | `stale` | `unavailable`). Never present cached/stale data as live current readings.
- **Unavailable states over placeholders**: If data is missing, render a clear unavailable state (e.g., *"PM10 reading currently unavailable from station"*) instead of `0`, `--` without explanation, or synthetic numbers.

## 2. Deterministic Risk Assessment & Medical Boundaries

- **Deterministic risk only**: Pollutant severity categories (CPCB NAQI Good → Severe), sensitive-group escalation (children, elderly, optional respiratory sensitivities), and hard activity constraints MUST be computed by deterministic Python rules in Node 3 (`risk_assessment`). The Gemini LLM MUST NOT independently invent or override risk levels.
- **No medical diagnosis or treatment**: The AI assistant and planner MUST NOT diagnose illnesses, prescribe medications/inhalers, or replace professional medical advice.
- **Emergency & medical escalation**: When AQI is `Severe` (>400 CPCB NAQI) or a user mentions acute respiratory/cardiac symptoms (e.g., wheezing, chest tightness, shortness of breath, asthma attack), immediately advise seeking qualified medical care or local emergency services and following official public-health advisories.

## 3. Grounded Recommendations & Validation

- Every daily-planner recommendation MUST include four explicit fields:
  1. **Action** (`what_to_do`): Concrete, practical step.
  2. **Rationale** (`why`): Plain-language explanation tied to retrieved readings and profile.
  3. **Alternative** (`alternative`): Practical indoor or lower-exposure fallback.
  4. **Evidence** (`supporting_data`): Specific environmental metrics, forecast points, or verified `knowledge_base` citation used.
- **Validation gate**: Node 5 (`validation_node`) MUST reject or replace any LLM output that contradicts deterministic risk constraints (e.g., suggesting outdoor jogging when `allow_strenuous_outdoor` is `false`), cites AQI numbers absent from retrieved context, or makes unsupported medical claims.

## 4. Honest Indoor & Impact Reporting

- **Measured vs. Estimated Indoor Air**: Because MVP does not integrate IoT indoor sensors, all indoor air quality assessments MUST be explicitly labeled as **Estimated (questionnaire-based)** and never presented as measured indoor PM2.5.
- **Separate Exposure vs. Emissions**: Personal exposure reduction (e.g., *skipped high-AQI outdoor run, ran HEPA purifier*) and environmental emissions reduction (e.g., *estimated kg CO2e avoided by carpooling*) MUST be stored, calculated, and displayed as distinct metrics — never merged into a single score.
- **Transparent Impact Assumptions**: Every CO2 avoided estimate MUST display the underlying assumptions (distance, vehicle type, occupancy, emission factor source) and be labeled as an **Estimate**.
