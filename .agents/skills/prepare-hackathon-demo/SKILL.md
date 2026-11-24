---
name: prepare-hackathon-demo
description: >-
  End-to-end verification runbook for the 10-step BreatheWise AI Hackathon
  Demonstration Scenario (PRD Section 15). Use on Day 9-10 or whenever verifying
  the complete user journey across desktop and mobile without manual DB edits.
---

# Prepare & Verify the Hackathon Demo

Use this runbook to rehearse and validate the exact 10-step demonstration flow defined in [PRD.md](../../../PRD.md) §15 and the acceptance metrics in §16.

## Demo Persona (PRD §15)

- **Household**: Two working parents + one school-going child living in a polluted urban area (e.g., Delhi NCR).
- **Daily concerns**: Morning exercise, school commute, office commute, indoor household activities, evening family activities.
- **Hard Rule**: The entire flow MUST succeed end-to-end with **zero manual Firestore edits** during the demo.

## 10-Step End-to-End Dry Run

Verify each step sequentially in a clean test account:

1. **Open BreatheWise AI** — Sign up / log in smoothly via Firebase Auth; landing dashboard loads without console errors.
2. **Select City** — Choose a supported polluted city (e.g., New Delhi) via location picker; confirm real external API fetch succeeds.
3. **Inspect Live AQI & Pollutants** — Verify Home Dashboard displays current CPCB NAQI, PM2.5, PM10, weather, pollution category badge, plain-language guidance, source attribution, and `Last updated` timestamp.
4. **Create Family Profile** — Add two working parents, one school-going child, commute habit (personal vehicle), exercise habit (morning outdoor walk), and indoor equipment (HEPA air purifier available). Save and verify persistence across page reload.
5. **Generate Daily Clean-Air Plan** — Trigger the 5-node LangGraph planner; verify structured Morning / Afternoon / Evening recommendations where each card shows *what to do*, *why*, *alternative*, and *supporting data*. Mark one item completed.
6. **Ask AI About Child's Outdoor Play** — Open AI Assistant and ask *"Can my child play outside today?"*; verify contextual response grounded in live AQI, child profile, and verified knowledge-base citations.
7. **Ask for Indoor Air Improvements** — Complete Indoor Air Quality Advisor questionnaire or ask *"How can I improve indoor air quality during severe smog?"*; verify personalized HEPA/ventilation/cooking tips explicitly labeled as **estimated** indoor guidance.
8. **Explore Sustainable Commute Alternatives** — Review lower-emission commuting suggestions (e.g., carpooling with 2 colleagues or public transit) tailored to the family's personal-car commute.
9. **Track a Sustainable Action** — Log a completed sustainable action (e.g., carpool commute) via the UI.
10. **Verify Impact Dashboard** — Open `My Impact`; verify completed action count, **Estimated CO2 Avoided** (with transparent assumptions popover), separate **Exposure-Reduction Indicators**, and updated weekly Recharts chart.

## Responsive & Resilience Spot Checks

- Verify all 5 screens at mobile width (`375px`) and desktop width (`1280px+`) with zero horizontal overflow.
- Verify [verify-ai-safety](../verify-ai-safety/SKILL.md) has passed on the deployed build.
- Capture backup screenshots/screen recording of the 10-step journey in case live venue Wi-Fi fluctuates during judging.
