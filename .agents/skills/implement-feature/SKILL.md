---
name: implement-feature
description: >-
  End-to-end procedure for implementing a BreatheWise AI functional requirement
  (FR-01 through FR-11) across Firestore, Cloud Functions Gen 2, and Vite + React.
  Use when starting work on a new PRD module, screen, endpoint, or roadmap day task.
---

# Implement a BreatheWise AI Feature

Use this runbook whenever building a functional requirement (`FR-01`–`FR-11`) or roadmap deliverable so implementation stays aligned with the PRD, schemas, and AI safety rules.

## Steps

1. **Check Scope & Priority**:
   - Open [docs/ROADMAP_AND_TASKS.md](../../../docs/ROADMAP_AND_TASKS.md) and confirm the target `FR-*` ID, priority (`P0`/`P1`), and acceptance criteria.
   - Verify the work does not cross into PRD §13 out-of-scope features.

2. **Load Relevant Blueprints**:
   - Data schema & indexes: [docs/DATA_MODEL.md](../../../docs/DATA_MODEL.md)
   - Endpoint & external API contracts: [docs/API_SPEC.md](../../../docs/API_SPEC.md)
   - AI workflow / deterministic risk rules (if AI-backed): [docs/AI_WORKFLOW.md](../../../docs/AI_WORKFLOW.md)
   - Screen layout & mandatory UI states: [docs/UI_UX_SPEC.md](../../../docs/UI_UX_SPEC.md)
   - Emission formulas / RAG docs (if Module 4, 5, or 6): [docs/IMPACT_AND_KNOWLEDGE.md](../../../docs/IMPACT_AND_KNOWLEDGE.md)

3. **Check Security & Rule Boundaries**:
   - If the feature requires new or modified Firestore security rules, delegate `firestore.rules` edits to the `firestore-rules-author` subagent (never author `firestore.rules` directly).
   - Confirm no server secrets (`GEMINI_API_KEY`, AQI API keys) are referenced in `client/`.

4. **Implement as a Vertical Slice**:
   - **Backend (`functions/`)**: Define/update Pydantic v2 schemas first, implement deterministic logic / provider / LangGraph node, wire authenticated Cloud Function handler, and add unit tests.
   - **Client (`client/`)**: Define matching TypeScript DTOs, build mobile-first Shadcn UI components, implement all five required UI states (`loading`, `fresh`, `stale`, `unavailable`, `error`), and wire authenticated API calls.

5. **Verify Before Completing**:
   - Run backend tests (`pytest` in `functions/`) and client checks (`pnpm lint && pnpm typecheck && pnpm test` in `client/`).
   - If the feature touches AI prompts, recommendations, or AQI display, run the checks in [verify-ai-safety](../verify-ai-safety/SKILL.md).
   - Update the checkbox status in [docs/ROADMAP_AND_TASKS.md](../../../docs/ROADMAP_AND_TASKS.md).
