---
trigger: glob
globs: "functions/**/*"
description: "Python Firebase Cloud Functions Gen 2, 5-node LangGraph workflow, Google Gemini structured output, Pydantic v2, and API reliability rules."
---

# Backend & AI Orchestration Rules (`functions/`)

Follow [docs/AI_WORKFLOW.md](../../docs/AI_WORKFLOW.md), [docs/API_SPEC.md](../../docs/API_SPEC.md), and [docs/DATA_MODEL.md](../../docs/DATA_MODEL.md) whenever working in `functions/`.

## 1. Runtime & Senior-Level Clean Architecture

- **Target Runtime**: Python 3.12 on Firebase Cloud Functions Gen 2 (`firebase-functions`, `firebase-admin`, `langgraph`, `google-genai` / `langchain-google-genai`, `pydantic>=2`, `httpx`).
- **Strict Layered Modular Structure (`functions/app/`)**: Never cram business logic, HTTP parsing, or external API calls into `main.py` or monolithic files. Keep `main.py` as a thin Cloud Functions bootstrapper and separate concerns strictly:
  - `config/` — Centralized typed settings (`settings.py`), secret definitions (`secrets.py`), and domain constants (`constants.py`: TTLs, CPCB breakpoints, emission factors). No magic numbers or scattered `os.getenv` calls.
  - `routes/` — Thin HTTP route handlers (auth guard, Pydantic request parsing, delegating to `services/`, standard response/error serialization). Zero business logic in routes.
  - `services/` — Reusable application use-case orchestrators (`air_quality_service.py`, `planner_service.py`, `chat_service.py`, `impact_service.py`) combining repositories, providers, domain logic, and LangGraph.
  - `providers/` — External API adapters behind clean Python `Protocol` interfaces (`base.py`, `waqi_provider.py`, `open_meteo_provider.py`, `maps_provider.py`, `gemini_provider.py`) so primary/fallback providers are swappable, testable, and reusable.
  - `repositories/` — Firestore Admin SDK persistence adapters (`user_repo.py`, `family_repo.py`, `air_quality_repo.py`, `plan_repo.py`, `chat_repo.py`, `impact_repo.py`, `knowledge_repo.py`) encapsulating all collection queries.
  - `domain/` — Pure, side-effect-free deterministic business logic (`risk_engine.py`, `impact_calculator.py`, `aqi_calculator.py`). 100% unit-testable with zero I/O.
  - `graph/` — LangGraph state (`state.py`), workflow assembly (`workflow.py`), individual node modules (`nodes/*.py`), prompt templates (`prompts/*.py`), and deterministic fallbacks (`fallbacks.py`).
  - `schemas/` — Reusable Pydantic v2 contracts (`common.py`, `environment.py`, `profile.py`, `planner.py`, `chat.py`, `impact.py`).
  - `utils/` — Shared, DRY cross-cutting utilities (`auth.py` token decorator, `errors.py` typed domain exceptions, `responses.py` standard JSON envelope builder, `http_client.py` shared `httpx` client with timeout/retry, `logger.py` PII-safe structured logger, `datetime_utils.py` UTC/freshness helpers).
- **Senior Code Quality & Reusability**:
  - Prefer **dependency injection** (passing providers/repositories into services and nodes) over module-level global singletons so every component is cleanly reusable and mockable in `pytest`.
  - Use full Python 3.12 type annotations (`|`, `Protocol`, `TypedDict`, `Final`), small focused single-responsibility functions, and explicit custom exceptions (`AppError`, `AuthenticationError`, `ValidationError`, `UpstreamProviderError`) mapped centrally in `routes/` to HTTP status codes.
  - Keep modules DRY: reuse shared `utils/http_client.py`, `utils/responses.py`, `utils/auth.py`, and shared Pydantic base models instead of repeating boilerplate per endpoint.
  - Validate all incoming request payloads, external API responses, and Gemini outputs with strict **Pydantic v2** models.

## 2. LangGraph 5-Node Contract

Every AI workflow invocation MUST preserve the five-node architecture from [PRD.md](../../PRD.md) §7.2:
1. `context_agent`: Loads user/family profile & equipment from Firestore; produces a sanitized context object (no raw PII in prompts).
2. `environment_agent`: Fetches normalized AQI, weather, and forecast (cache-first with TTL + fallback provider); attaches `freshness_status`.
3. `risk_assessment`: Pure deterministic Python engine (CPCB NAQI breakpoints + sensitive-group rules + constraint flags). **No LLM calls inside this node.**
4. `recommendation_agent`: Retrieves relevant verified `knowledge_base` chunks (RAG) and invokes Gemini with structured output conforming to Pydantic schemas and `risk_assessment` constraints.
5. `validation_node`: Verifies schema conformance, checks numeric grounding against `environment_agent` output, verifies zero constraint contradictions and zero medical diagnoses, and triggers bounded retry (max 1 retry) or deterministic safe fallback.

## 3. Security, Privacy & Observability

- **Auth Verification**: Verify the Firebase Auth ID token via `firebase_admin.auth.verify_id_token` on every protected endpoint; derive `user_id` strictly from the verified token (`uid`), never trusting client-supplied `userId` for authorization.
- **Secret Management**: Load `GEMINI_API_KEY`, AQI provider keys, and Google Maps keys from Firebase Functions secrets (`SecretParam` / Google Cloud Secret Manager). Never hardcode keys or commit `.env` files.
- **PII-Safe Logging**: Never log family member names, optional health conditions, raw user chat messages containing health info, or bearer tokens. Log structured metadata only (request ID, latency, node timings, AQI freshness status, fallback triggered flag).

## 4. Reliability & Bounded Execution

- Set explicit timeouts on all outbound HTTP calls (`httpx` ≤ 8s) and Gemini calls (≤ 20s), and bound total LangGraph execution (≤ 30s, max 1 validation retry).
- Cache external AQI/weather fetches in Firestore (`air_quality/{locationId}`) with explicit TTLs (current: 30 min, forecast: 3 hours) to minimize API latency and quota usage.
- If Gemini fails or times out, return a **deterministic rule-based fallback plan/response** clearly tagged `fallback_mode: true` rather than an HTTP 500 whenever environmental data is available.
