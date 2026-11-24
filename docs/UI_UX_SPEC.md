# UI/UX & Screen Specification — BreatheWise AI

> Derived from [PRD.md](../PRD.md) §6, §8.1, and §10. Defines the mobile-first layout, navigation, all five MVP screens, Indoor Air Advisor flow, AQI visual tokens, PWA requirements, and mandatory data-integrity UI states.

---

## 1. Design Principles & Navigation

- **Mobile-First Responsive**: Design primarily for `375px` mobile screens, expanding smoothly into a clean multi-column layout on tablet (`768px`) and desktop (`1280px+`).
- **Component Stack**: Tailwind CSS + Shadcn UI + Lucide icons + Recharts.
- **Navigation Pattern**:
  - **Mobile**: Persistent bottom tab bar with 5 tabs (`Home`, `Planner`, `Assistant`, `Impact`, `Family`).
  - **Desktop**: Left sidebar with brand mark, active city selector, and the same 5 primary destinations + user menu.
- **Calm, Actionable Tone**: High-contrast readable typography, scannable cards, clear priority badges, and plain-language guidance — avoid dense scientific jargon without explanation.

---

## 2. CPCB NAQI Visual Tokens (Accessible)

Never rely on color alone: always render **Color + Category Label + Severity Icon**.

| CPCB NAQI | Category | Accent Token (Tailwind) | Surface Tint | Icon Cue |
|---|---|---|---|---|
| `0 – 50` | `Good` | `emerald-600` | `emerald-50` | CheckCircle / Leaf |
| `51 – 100` | `Satisfactory` | `lime-600` | `lime-50` | Wind / Smile |
| `101 – 200` | `Moderate` | `amber-600` | `amber-50` | AlertCircle |
| `201 – 300` | `Poor` | `orange-600` | `orange-50` | AlertTriangle |
| `301 – 400` | `Very Poor` | `red-600` | `red-50` | ShieldAlert |
| `401 – 500+` | `Severe` | `rose-900` / `purple-900` | `rose-100` | OctagonAlert |
| `null` | `Unavailable` | `slate-500` | `slate-100` | CloudOff |

---

## 3. Auth & Onboarding Flow (`/login`, `/onboarding`)

- **Sign In / Register**: Firebase Authentication (Email/Password + Google Sign-In) with clear privacy statement (*"Your family profile stays private and is used only to personalize clean-air advice."*).
- **Fast 2-Step Onboarding** (for new users):
  1. Select city / location (with search + quick-pick chips for major cities like New Delhi, Gurugram, Noida, Mumbai, Bengaluru).
  2. Quick household setup (add family members, primary commute mode, exercise habit, HEPA purifier toggle) — skippable to Dashboard with an inline prompt to complete personalization.

---

## 4. Five Primary MVP Screens

### Screen 1: Home Dashboard (`/`)
- **Top Bar**: Active city pill (opens Location Selector dialog/sheet) + refresh button + freshness status badge (`Live` / `Cached · Stale` / `Unavailable`).
- **Hero AQI Card**: Large CPCB NAQI numeric readout, Category badge, plain-language everyday health guidance summary, data source attribution, and `Last updated` relative + exact timestamp.
- **Pollutant & Weather Grid**:
  - `PM2.5` (`µg/m³`) and `PM10` (`µg/m³`) cards (explicitly showing *"Unavailable"* if null).
  - Weather strip: Temperature (`°C`), Humidity (`%`), Wind Speed & Direction.
- **Forecast Strip (when available)**: Recharts area/bar mini-chart clearly labeled **"Forecast (Estimated)"** and visually distinct from current observations. If forecast unavailable, display a clean note instead of an empty broken chart.
- **Today's Top Actions Preview**: Top 3 high-priority items from today's Daily Clean-Air Plan (or CTA button *"Generate Today's Plan"* if not yet generated).
- **Quick Launch Cards**:
  - *"Ask BreatheWise AI"* quick-prompt bar (`"Can my child play outside?"`).
  - *"Check Indoor Air Advisor"* card opening the Module 4 questionnaire/recommendations view.

### Screen 2: Family Profile (`/profile`)
- **Household & Location Card**: Household name, primary city/location selector.
- **Family Members List**: Add/edit/remove members (`nickname`, `role`, `ageGroup`, work/school schedule times, optional commute override).
  - **Optional Health Sensitivities Accordion**: Marked with a lock icon and explicit label: *"Optional & Private — used only for conservative general guidance, never medical diagnosis."*
- **Lifestyle & Commute Card**: Primary transport mode, daily commute distance (km), vehicle fuel type, outdoor exercise preferences.
- **Indoor Air Equipment Card**: Toggles for HEPA air purifier (and room count), kitchen exhaust fan, cross-ventilation, N95 masks, indoor smoking presence.
- **Save Feedback**: Toast confirmation + banner prompting to refresh today's Daily Plan when key profile attributes change.

### Screen 3: Daily Clean-Air Planner (`/planner`)
- **Header**: Today's date, Environmental Context summary pill (`AQI 342 · Very Poor · Source`), and `Regenerate Plan` button (shows deterministic fallback notice if `fallbackMode: true`).
- **Time-of-Day Tabs / Sections**: `Morning`, `Afternoon`, `Evening`.
- **Recommendation Cards**:
  - Checkbox (`Mark completed` — persists `completedItemIds` to Firestore with optimistic UI).
  - Priority indicator (`High`, `Medium`, `Low`), category badge, target family members chips.
  - **Mandatory 4-Part Structure**:
    1. **What to do** (headline & clear action)
    2. **Why** (plain-language link to AQI & family context)
    3. **Alternative** (practical indoor or lower-exposure swap)
    4. **Supporting Data** (collapsible/subtle footer citing exact AQI/PM reading, forecast, or verified KB source)
- **Indoor Air Quality Advisor Drawer / Sub-Tab (`/planner?tab=indoor` or `/indoor-advisor`)**:
  - Quick 7-question Home Air Questionnaire (cooking fuel, exhaust use, HEPA purifier, incense/dhoop, sweeping method, window sealing, indoor smoking).
  - Explicit banner: **"Estimated Indoor Assessment — based on your questionnaire & outdoor AQI (not sensor-measured)."**
  - Prioritized indoor improvement checklist with source citations.

### Screen 4: AI Assistant (`/assistant`)
- **Chat Thread**: User & assistant message bubbles with timestamp and optional session switcher.
- **Suggested Starter Chips** (PRD §6 Module 6):
  - *"What is the current air quality in my location?"*
  - *"Can my child play outside today?"*
  - *"Should I go jogging this morning?"*
  - *"How can I improve indoor air quality?"*
  - *"How can I reduce pollution from my commute?"*
- **Assistant Message Anatomy**:
  - Plain-language grounded answer.
  - Collapsible **"Sources & Data Used"** pill showing live AQI snapshot + verified `knowledge_base` citations.
  - Tappable **Follow-up Action Chips** (e.g., *"Log carpool action"*, *"View Daily Plan"*).
  - Red/amber **Medical Escalation Alert** whenever `medical_escalation_required` triggered.
- **Persistent Footer**: *"BreatheWise AI provides general environmental guidance and does not diagnose diseases or replace professional medical advice."*

### Screen 5: My Impact (`/impact`)
- **Quick Log Action Bar**: 1-tap buttons & modal for logging:
  - *Emissions-Reducing Actions*: Carpool commute, Public transit, Walk/Cycle (only suggested when AQI ≤ Moderate), Work from Home, Energy-saving habit.
  - *Exposure-Protection Actions*: Swapped to indoor workout, Ran HEPA purifier during peak smog, Wore N95 mask outdoors.
- **Strictly Separated Metric Cards** (PRD §6 Module 5):
  1. **Environmental Impact (Estimate)**: Total `kg CO2e` avoided (7-day & all-time) with mandatory **"Estimate · View Assumptions"** popover showing distance, vehicle type, occupancy, and emission factors.
  2. **Personal Exposure Protection**: Count of protective actions completed during elevated AQI (explicitly NOT converted into CO2).
- **Weekly Progress Chart**: Recharts bar/line visualization switching cleanly between *Estimated CO2 Avoided (kg)* and *Protective Actions Completed*.
- **Achievements & Recent Log List**: Lightweight milestone badges (e.g., *First Green Commute*, *7-Day Clean-Air Streak*) and chronological action log with delete option.

---

## 5. Mandatory UI States & PWA Checklist

- **Every screen must render**:
  - `Loading`: Shadcn `Skeleton` placeholders matching card geometry.
  - `Stale Data`: Prominent amber alert banner (*"Showing cached reading from [time] — live station temporarily unavailable"*).
  - `Unavailable Data`: Neutral slate card explaining missing station/forecast data with a `Retry` button and zero fake values.
  - `Fallback Mode`: Subtle informational badge (*"Generated using verified safety guidelines while AI service reconnects"*).
- **PWA Requirements**:
  - `frontend/public/manifest.json` (name: `BreatheWise AI`, short_name: `BreatheWise`, `display: standalone`, theme color, 192px & 512px icons).
  - Responsive viewport meta tags and clean mobile touch targets (`≥ 44×44px`).
