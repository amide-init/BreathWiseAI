---
name: build-langgraph-node
description: >-
  Step-by-step runbook for implementing, modifying, or testing any of the five
  BreatheWise AI LangGraph nodes (context, environment, risk assessment,
  recommendation, validation), Pydantic contracts, or RAG retrieval. Use when
  working on functions/ LangGraph orchestration or Gemini structured outputs.
---

# Build or Modify a LangGraph Node

Use this runbook when creating or updating any node in BreatheWise AI's 5-node LangGraph workflow (`context_agent` → `environment_agent` → `risk_assessment` → `recommendation_agent` → `validation_node`).

## Steps

1. **Review the AI Contract**:
   - Read [docs/AI_WORKFLOW.md](../../../docs/AI_WORKFLOW.md) for the exact `BreatheWiseState` fields, node boundaries, CPCB NAQI risk matrix, and Pydantic output schemas.
   - Re-check [.agents/rules/ai-safety-and-grounding.md](../../rules/ai-safety-and-grounding.md) before editing any prompt or deterministic rule.

2. **Enforce Strict Node Boundaries**:
   - **`context_agent`**: Fetch user/family/equipment context from Firestore; strip raw PII (full names, emails, free-text medical identifiers) into a safe profile summary before passing downstream.
   - **`environment_agent`**: Retrieve current AQI, weather, and available hourly forecasts via cache-first repository (`air_quality/{locationId}`). Attach explicit `observed_at`, `source`, and `freshness_status` (`fresh` | `stale` | `unavailable`). Never invent missing fields.
   - **`risk_assessment`**: Implement 100% deterministic Python logic (CPCB NAQI breakpoints + sensitive-group escalations + explicit `RiskConstraints` flags). **Zero LLM calls allowed here.**
   - **`recommendation_agent`**: Query verified `knowledge_base` documents relevant to the risk tier/topic, inject deterministic `RiskConstraints` into the Gemini prompt, and request structured output matching the Pydantic schema (including the 4-part recommendation structure: `what_to_do`, `why`, `alternative`, `supporting_data`).
   - **`validation_node`**: Programmatically validate:
     - Pydantic schema compliance.
     - No hallucinated AQI/PM values absent from `environment_agent`.
     - No fabricated "safe time windows" when hourly forecast is unavailable or elevated.
     - Zero contradictions against `RiskConstraints` (e.g., outdoor vigorous exercise recommended when forbidden).
     - Zero medical diagnoses or prescription advice.
     - On failure: retry `recommendation_agent` at most once with explicit violation feedback; on second failure, return the deterministic safe fallback (`fallback_mode = True`).

3. **Write Targeted Unit Tests**:
   - Test each node in isolation with mocked Firestore/HTTP/Gemini responses covering:
     - Happy path (`Good` / `Moderate` AQI and `Very Poor` / `Severe` AQI).
     - Stale cache data (`freshness_status == "stale"`).
     - Unavailable AQI or unavailable forecast (`freshness_status == "unavailable"`).
     - Adversarial LLM output (invented AQI number, contradictory outdoor exercise suggestion, medical diagnosis) caught and corrected by `validation_node`.

4. **Verify**:
   - Run `pytest` on the LangGraph test suite and verify bounded execution latency and zero PII leakage in captured log output.
