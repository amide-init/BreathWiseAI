# BreatheWise AI — Antigravity Workspace Guide

**BreatheWise AI** is an AI-powered personal clean-air assistant (10-day GenAI Hackathon MVP) that translates real-time air-quality data, weather, and family profiles into personalized daily routines, indoor air improvements, sustainable lifestyle alternatives, and transparent environmental impact tracking.

> **Source of Truth**: [PRD.md](./PRD.md) defines all product requirements. Workspace folder is `BreathWiseAI`, while the official product name is **BreatheWise AI**.

---

## 1. Tech Stack & Planned Monorepo Layout

```text
BreathWiseAI/
├── GEMINI.md                  # Always-on agent handbook (this file)
├── README.md                  # Project overview & quick start
├── PRD.md                     # Product Requirements Document (v1.0)
├── .agents/
│   ├── rules/                 # Modular Antigravity rules (always_on, glob, model_decision)
│   └── skills/                # On-demand Antigravity skills (SKILL.md runbooks)
├── docs/                      # Detailed engineering & UX blueprints
├── client/                    # [Planned] Next.js App Router, React, TypeScript, Tailwind, Shadcn UI, Recharts (PWA)
├── functions/                 # [Planned] Firebase Cloud Functions Gen 2 (Python), LangGraph, Gemini, Pydantic
├── firebase.json              # [Planned] Firebase CLI & emulator configuration
├── apphosting.yaml            # [Planned] Firebase App Hosting config (Next.js SSR)
├── firestore.rules            # [Planned] Cloud Firestore security rules (author via firestore-rules-author)
└── firestore.indexes.json     # [Planned] Composite Firestore indexes
```

- **Auth & DB**: Firebase Authentication + Cloud Firestore (7 core collections).
- **AI Orchestration**: 5-node LangGraph workflow (`context_agent` → `environment_agent` → `risk_assessment` → `recommendation_agent` → `validation_node`) using Google Gemini + Pydantic + verified RAG knowledge base.
- **AQI & Weather Baseline**: India **CPCB NAQI (0–500)** primary scale (WAQI / data.gov.in CPCB primary source) + **Open-Meteo** for weather, AQ forecasts, and fallback + **Google Maps** for geocoding/location.
- **Hosting**: Firebase App Hosting for Next.js SSR.

---

## 2. Hackathon Scope Guardrails (10-Day MVP)

- **P0 (Must-Have)**: Auth (`FR-01`), Location selection (`FR-02`), Real-time AQI (`FR-03`), Pollutant readings (`FR-04`), Family profile (`FR-05`), AI Daily Planner (`FR-06`), Indoor Air Advisor (`FR-07`), Conversational AI Assistant (`FR-08`), Sustainable alternatives (`FR-09`).
- **P1 (High-Value MVP)**: Environmental impact calculation (`FR-10`), Verified RAG knowledge retrieval (`FR-11`).
- **P2 (Defer unless P0+P1 complete)**: Push notifications (`FR-12`), Community challenges (`FR-13`).
- **Explicitly Out of Scope**: Training custom foundation models, custom IoT hardware, native Android/iOS apps, citywide ML pollution prediction, full social networking, autonomous multi-agent swarms.

---

## 3. Non-Negotiable Engineering & Safety Invariants

1. **AI Safety & Grounding** (enforced by [.agents/rules/ai-safety-and-grounding.md](./.agents/rules/ai-safety-and-grounding.md)):
   - Never fabricate AQI, PM2.5, PM10, weather readings, or "safe time windows" without supporting forecast data.
   - Risk classification MUST be deterministic (code/rules, never LLM-decided). Never diagnose diseases or replace medical advice.
   - Always surface observation timestamp, source, and freshness status (`fresh` / `stale` / `unavailable`).
   - Clearly separate **measured vs. estimated** indoor air quality, and **personal exposure reduction vs. CO2 emissions avoided**.
2. **Security & Privacy**:
   - Never put Gemini API keys or external AQI secrets in `client/` or `NEXT_PUBLIC_*` env vars.
   - Verify Firebase Auth ID tokens on every protected Cloud Function endpoint.
   - Keep family profiles and optional health sensitivities strictly user-owned and excluded from server logs.
   - **Mandatory delegation**: Whenever creating or modifying `firestore.rules`, delegate to the `firestore-rules-author` subagent.
3. **Reliability**:
   - Cache external AQI/weather reads in Firestore with explicit TTL & freshness labels.
   - Bound LangGraph execution time and provide deterministic fallback responses if Gemini or an external API fails.

---

## 4. Documentation Map (Read Before Coding)

Read only the spec(s) relevant to your current task before writing code:

| Area | Document | When to Read |
|---|---|---|
| Product & Scope | [PRD.md](./PRD.md) | Checking requirements, modules, or acceptance criteria |
| System Design | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Repo setup, request flows, caching, Firebase services |
| Firestore Schema | [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) | Collections, field types, indexes, access control matrix |
| LangGraph & AI | [docs/AI_WORKFLOW.md](./docs/AI_WORKFLOW.md) | 5-node state graph, Pydantic contracts, deterministic risk rules, RAG |
| APIs & Providers | [docs/API_SPEC.md](./docs/API_SPEC.md) | Cloud Functions endpoints, external AQI/weather integrations, freshness |
| Screens & UI | [docs/UI_UX_SPEC.md](./docs/UI_UX_SPEC.md) | 5 MVP screens, Indoor Advisor flow, AQI badges, PWA & error states |
| Impact & RAG | [docs/IMPACT_AND_KNOWLEDGE.md](./docs/IMPACT_AND_KNOWLEDGE.md) | CO2 formulas, emission factors, verified `knowledge_base/` seed docs |
| 10-Day Plan | [docs/ROADMAP_AND_TASKS.md](./docs/ROADMAP_AND_TASKS.md) | Day 1–10 task checklist, FR traceability, 10-step demo script |

---

## 5. Workspace Rules & On-Demand Skills

- **Modular Rules**:
  - [.agents/rules/ai-safety-and-grounding.md](./.agents/rules/ai-safety-and-grounding.md) (`always_on`)
  - [.agents/rules/client-nextjs.md](./.agents/rules/client-nextjs.md) (`glob: client/**/*`)
  - [.agents/rules/backend-python-langgraph.md](./.agents/rules/backend-python-langgraph.md) (`glob: functions/**/*`)
  - [.agents/rules/firestore-and-security.md](./.agents/rules/firestore-and-security.md) (`model_decision`)
- **On-Demand Skills**:
  - `implement-feature` — [.agents/skills/implement-feature/SKILL.md](./.agents/skills/implement-feature/SKILL.md)
  - `build-langgraph-node` — [.agents/skills/build-langgraph-node/SKILL.md](./.agents/skills/build-langgraph-node/SKILL.md)
  - `verify-ai-safety` — [.agents/skills/verify-ai-safety/SKILL.md](./.agents/skills/verify-ai-safety/SKILL.md)
  - `prepare-hackathon-demo` — [.agents/skills/prepare-hackathon-demo/SKILL.md](./.agents/skills/prepare-hackathon-demo/SKILL.md)
- **Installed Platform Skills**: Use the installed Firebase skills (`firebase-basics`, `firebase-auth-basics`, `firebase-firestore`, `firebase-app-hosting-basics`, `firebase-security-rules-auditor`) when configuring or deploying Firebase services.
