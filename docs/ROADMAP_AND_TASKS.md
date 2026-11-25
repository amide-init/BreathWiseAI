# 10-Day Development Roadmap & Acceptance Tracker — BreatheWise AI

> Derived from [PRD.md](../PRD.md) §11, §13, §14, §15, and §16. Use this document as the live execution tracker while building BreatheWise AI.

---

## 1. Functional Requirements Traceability Matrix

| ID | Requirement | Priority | Primary Screen / Module | Backend / Firestore Touchpoints | Status |
|---|---|---|---|---|---|
| `FR-01` | User registration and login | **P0** | `/login`, Auth Guard | Firebase Auth, `users/{uid}` | [x] |
| `FR-02` | Location selection | **P0** | Onboarding, Home top bar, `/profile` | `GET /api/v1/locations/search`, `users/{uid}` | [x] |
| `FR-03` | Retrieve real-time AQI | **P0** | Home Dashboard (`/`) | `GET /api/v1/air-quality`, `air_quality/{locationId}` | [x] |
| `FR-04` | Display pollutant measurements (PM2.5, PM10, weather, freshness) | **P0** | Home Dashboard (`/`) | `GET /api/v1/air-quality` | [x] |
| `FR-05` | Family profile management | **P0** | Family Profile (`/profile`) | `families/{familyId}`, `members/{memberId}` | [x] |
| `FR-06` | Generate AI daily planner (4-part recommendations) | **P0** | Daily Planner (`/planner`) | `generate_daily_plan` (`on_call`), `daily_plans/` | [x] |
| `FR-07` | Generate indoor air recommendations (estimated) | **P0** | Indoor Air Advisor (`/planner?tab=indoor`) | `assess_indoor_air` (`on_call`), `families/` | [x] |
| `FR-08` | Conversational AI assistant | **P0** | AI Assistant (`/assistant`) | `send_chat_message` (`on_call`), `chat_sessions/` | [x] |
| `FR-09` | Sustainable alternatives | **P0** | Daily Planner, Assistant, `/impact` | LangGraph Node 4 + `log_impact_action` (`on_call`) | [x] |
| `FR-10` | Environmental impact calculation (separate exposure vs CO2) | **P1** | My Impact (`/impact`) | `log_impact_action`, `get_impact_summary`, `impact_logs/` | [x] |
| `FR-11` | Retrieve supporting knowledge (RAG) | **P1** | Planner, Indoor Advisor, Assistant | `knowledge_base/` seed + Node 4 RAG | [x] |
| `FR-12` | Pollution notifications (FCM) | **P2** | Optional / Post-MVP | Firebase Cloud Messaging | [ ] |
| `FR-13` | Community challenges | **P2** | Optional / Post-MVP | Deferred out of core 10-day MVP | [ ] |

---

## 2. Ten-Day Execution Plan (PRD §14)

### Day 1 — Project Setup, UI Design System & Firebase Configuration
- [x] Initialize `client/` (Vite, React, TypeScript, React Router, Tailwind CSS, Shadcn UI, Recharts, PWA manifest via `pnpm`).
- [x] Initialize `functions/` (Python 3.12 Firebase Cloud Functions Gen 2 structure + `pytest`).
- [x] Configure Firebase project (`agentora-ai-v2`), local Emulators + Hosting SPA rewrites (`firebase.json`), and `firestore.indexes.json`.
- [x] Delegate initial `firestore.rules` creation to the `firestore-rules-author` subagent per [DATA_MODEL.md](./DATA_MODEL.md).
- [x] Build mobile-first app shell (bottom tab nav on mobile, sidebar on desktop) and CPCB NAQI visual token components.

### Day 2 — Authentication, Firestore & AQI Integration (`FR-01`, `FR-02`, `FR-03`, `FR-04`)
- [x] Implement Firebase Auth (Email/Password + Google Sign-In) and user bootstrap (`users/{uid}`).
- [x] Implement server-side Firebase ID token verification middleware in `functions/`.
- [x] Implement `GET /api/v1/locations/search` (Google Maps + curated fallback cities).
- [x] Implement `GET /api/v1/air-quality` with WAQI/CPCB primary, Open-Meteo weather & AQ forecast/fallback, Firestore caching (30 min / 3 hr TTL), and explicit `freshnessStatus`.
- [x] Build Screen 1 (Home Dashboard) with loading, fresh, stale-warning, and unavailable states.

### Day 3 — Family Profile & Personalization (`FR-05`)
- [x] Implement Family Profile onboarding & Screen 2 (`/profile`) CRUD for `families/{familyId}` and `members/{memberId}`.
- [x] Add schedules, commute habits, exercise preferences, indoor equipment toggles, and clearly labeled Optional & Private health sensitivity fields.
- [x] Verify Firestore security rules enforce strict owner-only access.

### Day 4 — LangGraph Workflow, RAG Seed & Gemini Integration (`FR-11`)
- [x] Seed verified `knowledge_base/` documents in Firestore per [IMPACT_AND_KNOWLEDGE.md](./IMPACT_AND_KNOWLEDGE.md).
- [x] Implement all 5 LangGraph nodes in `functions/app/graph/` per [AI_WORKFLOW.md](./AI_WORKFLOW.md):
  - Node 1 `context_agent` (with PII sanitization)
  - Node 2 `environment_agent`
  - Node 3 `risk_assessment` (100% deterministic CPCB NAQI engine)
  - Node 4 `recommendation_agent` (RAG + Gemini structured output)
  - Node 5 `validation_node` (schema, numeric grounding, contradiction & medical checks + deterministic fallback)
- [x] Write unit tests covering deterministic risk rules, missing/stale data, and validation rejection.

### Day 5 — AI Personalized Daily Planner (`FR-06`, `FR-09`)
- [x] Implement `generate_daily_plan` (`on_call`) backed by the 5-node LangGraph workflow.
- [x] Build Screen 3 (`/planner`) displaying Morning / Afternoon / Evening 4-part recommendation cards, priority badges, citations, and completion toggles persisted to `daily_plans/`.
- [x] Connect Today's Top Actions preview on Home Dashboard.

### Day 6 — Indoor Air Quality Advisor & Conversational Assistant (`FR-07`, `FR-08`)
- [x] Implement `assess_indoor_air` (`on_call`) and Indoor Air Questionnaire UI with explicit **"Estimated (questionnaire-based)"** labeling.
- [x] Implement `send_chat_message` (`on_call`) with session persistence (`chat_sessions/{sessionId}/messages/`), RAG citations, and medical escalation safety.
- [x] Build Screen 4 (`/assistant`) with starter prompt chips, source citations, follow-up chips, and persistent medical disclaimer.

### Day 7 — Sustainability & Impact Tracking (`FR-09`, `FR-10`)
- [x] Implement deterministic `impact_calculator.py`, `log_impact_action`, `get_impact_summary`, and `delete_impact_action` (`on_call`) per [IMPACT_AND_KNOWLEDGE.md](./IMPACT_AND_KNOWLEDGE.md).
- [x] Build Screen 5 (`/impact`) keeping **Estimated CO2 Avoided** (with visible assumptions popover) strictly separate from **Personal Exposure Protection** indicators, plus Recharts 14-day chart.

### Day 8 — Frontend/Backend Integration & UI Refinement
- [x] Connect all screens end-to-end against deployed Firebase services (`agentora-ai-v2`, `asia-south1`).
- [x] Polish mobile (`375px`) and desktop (`1280px+`) layouts with YC-grade Zinc + Emerald Light/Dark theme, Shantell Sans illustrated typography, icon-first mobile bottom bar, Settings page, PWA manifest, and error/stale banners.
- [x] Verify bounded LangGraph execution and deterministic fallbacks.

### Day 9 — Testing, AI Safety Validation & Deployment
- [x] Run full `pytest` suite (49/49 passing) and frontend lint/typecheck/test/build checks (6/6 passing).
- [x] Execute [.agents/skills/verify-ai-safety/SKILL.md](../.agents/skills/verify-ai-safety/SKILL.md) red-team suite (`tests/test_ai_safety_redteam.py` + client secret hygiene audit).
- [x] Deploy Cloud Functions Gen 2 (9 Python 3.14 callables), Firestore rules/indexes, and `client/dist` to Firebase Hosting (`https://agentora-ai-v2.web.app`).

### Day 10 — Demo Preparation, Documentation & Submission
- [x] Verify 10-step demo readiness against [.agents/skills/prepare-hackathon-demo/SKILL.md](../.agents/skills/prepare-hackathon-demo/SKILL.md) with zero manual DB edits required.
- [ ] Capture backup walkthrough recording/screenshots before judging.

---

## 3. Prototype Acceptance Metrics (PRD §16)

| Metric | Target | Verified |
|---|---|---|
| AQI data retrieval | Successful for supported locations (with clear stale/unavailable handling) | [x] |
| Profile personalization | Distinct tailored plans for different family profiles | [x] |
| Daily plan generation | Valid structured 4-part response (Morning/Afternoon/Evening) | [x] |
| Recommendation validation | Zero unsupported critical claims across safety test scenarios | [x] |
| AI assistant | Grounded contextual answers with citations & non-diagnostic boundaries | [x] |
| Impact tracking | Transparent assumptions; emissions & exposure strictly separated | [x] |
| Responsive interface | Cleanly usable on mobile (`375px`) and desktop (`1280px+`) | [x] |
| End-to-end demo | All 10 demo steps live on `https://agentora-ai-v2.web.app` (zero manual DB edits) | [x] |
