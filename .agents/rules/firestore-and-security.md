---
trigger: model_decision
description: "Apply when designing, querying, indexing, or securing Cloud Firestore collections, firestore.rules, Firebase Auth integration, or server-side secret configuration."
---

# Firestore, Authentication & Security Rules

Follow [docs/DATA_MODEL.md](../../docs/DATA_MODEL.md) and [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) when working on Firebase Auth, Cloud Firestore, or secrets.

## 1. Mandatory Subagent Delegation for `firestore.rules`

- **NEVER write or edit `firestore.rules` directly in the main agent.**
- Always delegate authoring, refactoring, or hardening `firestore.rules` to the **`firestore-rules-author`** specialist subagent, providing it the exact collection schema and access matrix from [docs/DATA_MODEL.md](../../docs/DATA_MODEL.md).
- After authoring, audit the rules against `firebase-security-rules-auditor` guidelines before deployment.

## 2. Ownership & Access Control Boundaries

Enforce least privilege across all 7 collections:
- **Strictly User-Owned (Read/Write own records only)**:
  - `users/{userId}` — accessible only where `request.auth.uid == userId`.
  - `families/{familyId}` and `families/{familyId}/members/{memberId}` — accessible only where `ownerUserId == request.auth.uid`.
  - `daily_plans/{planId}` — read & limited completion-toggle update (`completedActionIds` / item completion status) by owner; plan creation/regeneration performed server-side via Firebase Admin SDK.
  - `chat_sessions/{sessionId}` and `messages/{messageId}` — read by owner; assistant messages written server-side via Admin SDK.
  - `impact_logs/{logId}` — read by owner; validated writes enforcing owner `userId == request.auth.uid` and bounded payload sizes.
- **Read-Only for Authenticated Users (Server-Write Only via Admin SDK)**:
  - `air_quality/{locationId}` (and `forecasts` subcollection) — cached environmental readings populated solely by Cloud Functions.
  - `knowledge_base/{documentId}` — curated verified environmental/health guidance populated via seed script / Admin SDK.

## 3. Data Privacy & Validation

- Keep optional health sensitivity fields nested cleanly under family member documents so they can be minimized, omitted, or deleted independently.
- Validate required fields, string lengths, and immutable ownership fields (`userId`, `ownerUserId`, `createdAt`) on every write.
- Define composite indexes in `firestore.indexes.json` for every multi-field query (e.g., `daily_plans` by `userId` + `planDate`, `impact_logs` by `userId` + `loggedAt`, `chat_sessions` by `userId` + `updatedAt`).

## 4. Firebase Platform Skills

- Use installed Firebase skills (`firebase-basics`, `firebase-auth-basics`, `firebase-firestore`, `firebase-app-hosting-basics`) when running CLI commands, emulator configuration, or deployment steps.
