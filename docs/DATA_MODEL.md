# Cloud Firestore Data Model — BreatheWise AI

> Derived from [PRD.md](../PRD.md) §8.3, §9, and §12. Defines our **Hybrid Root + Per-User Subcollections** Cloud Firestore architecture, document schemas, privacy boundaries, composite indexes, and the security access matrix.

> [!IMPORTANT]
> When translating this schema into `firestore.rules`, **always delegate authoring to the `firestore-rules-author` subagent** (never author `firestore.rules` directly in the main agent).

---

## 1. Hybrid Architecture & Entity Relationship Overview

BreatheWise AI uses a **Hybrid Root + `users/{userId}` Subcollections** layout:
- **Shared Global Root Collections** (`air_quality`, `knowledge_base`, `translation_cache`): Non-PII, globally shared across all users so external AQI/weather fetches, verified RAG guidance, and UI translations are cached once and reused.
- **Per-User Subtree under `users/{userId}`** (`families`, `daily_plans`, `chat_sessions`, `impact_logs`, `saved_cities`, `private/usage`): Strictly owner-scoped by path, eliminating billable Security Rule `get()` calls (`isFamilyOwner` / `isChatSessionOwner`), removing redundant `userId` composite indexes, and enabling O(1) direct lookups like `users/{uid}/daily_plans/{planDate}_{locationId}`.

```mermaid
erDiagram
    USERS ||--o{ FAMILIES : "subcollection"
    FAMILIES ||--|{ MEMBERS : "subcollection"
    USERS ||--o{ DAILY_PLANS : "subcollection"
    USERS ||--o{ CHAT_SESSIONS : "subcollection"
    CHAT_SESSIONS ||--|{ MESSAGES : "subcollection"
    USERS ||--o{ IMPACT_LOGS : "subcollection"
    USERS ||--o{ SAVED_CITIES : "subcollection"
    USERS ||--o| PRIVATE_USAGE : "subcollection"
    SAVED_CITIES }o--|| AIR_QUALITY : "references locationId"
    AIR_QUALITY ||--o{ FORECASTS : "subcollection"
    KNOWLEDGE_BASE }o--o{ DAILY_PLANS : "grounds"
```

---

## 2. Shared Global Root Collections

### 2.1 `air_quality/{locationId}` & `air_quality/{locationId}/forecasts/{hourKey}`

Shared environmental data cache populated **exclusively by Cloud Functions (Admin SDK)**. `locationId` is a normalized slug (e.g., `new-delhi-in` or `in-new-delhi-28.61-77.21`).

#### Parent Document: `air_quality/{locationId}`

| Field | Type | Required | Description |
|---|---|---|---|
| `locationId` | `string` | Yes | Normalized location key |
| `locationName` | `string` | Yes | Human-readable city/area name |
| `lat` | `number` | Yes | Latitude |
| `lng` | `number` | Yes | Longitude |
| `current` | `map` | Yes | Normalized current observation (below) |
| `weather` | `map` | Yes | `{ tempC, humidityPct, windSpeedKmh, windDirectionDeg, observedAt, source }` |
| `fetchedAt` | `timestamp` | Yes | When backend last fetched from provider |
| `expiresAt` | `timestamp` | Yes | `fetchedAt + 30 minutes` |

`current` map structure (aligned with PRD §9 Data Freshness):
- `aqi`: `number | null` (CPCB NAQI 0–500; `null` if unavailable)
- `aqiScale`: `"CPCB_NAQI"`
- `category`: `"Good"` | `"Satisfactory"` | `"Moderate"` | `"Poor"` | `"Very Poor"` | `"Severe"` | `"Unavailable"`
- `dominantPollutant`: `"pm25"` | `"pm10"` | `"no2"` | `"so2"` | `"co"` | `"o3"` | `null`
- `readings`: `array` of `{ pollutant, value, unit, observedAt, source, freshnessStatus }` (explicit entries for `PM2.5` in `µg/m³` and `PM10` in `µg/m³`)
- `observedAt`: `timestamp | null`
- `source`: `string` (e.g., `"WAQI / CPCB Station - Anand Vihar"` or `"Open-Meteo Air Quality (Fallback)"`)
- `freshnessStatus`: `"fresh"` | `"stale"` | `"unavailable"`

#### Subcollection: `air_quality/{locationId}/forecasts/{hourKey}`
`hourKey` format: `YYYY-MM-DDTHH` (UTC or local ISO hour).

| Field | Type | Required | Description |
|---|---|---|---|
| `forecastFor` | `timestamp` | Yes | Target hour timestamp |
| `pm25` | `number \| null` | No | Forecast PM2.5 (`µg/m³`) |
| `pm10` | `number \| null` | No | Forecast PM10 (`µg/m³`) |
| `estimatedNaqi` | `number \| null` | No | Derived CPCB NAQI estimate (labeled as forecast) |
| `tempC` | `number \| null` | No | Forecast temperature |
| `windSpeedKmh` | `number \| null` | No | Forecast wind speed |
| `source` | `string` | Yes | e.g., `"Open-Meteo Air Quality Forecast"` |
| `fetchedAt` | `timestamp` | Yes | Cache timestamp |
| `expiresAt` | `timestamp` | Yes | `fetchedAt + 3 hours` |

---

### 2.2 `knowledge_base/{documentId}`
Verified environmental & public-health guidance chunks used for RAG grounding (seeded via Admin SDK).

| Field | Type | Required | Description |
|---|---|---|---|
| `docId` | `string` | Yes | Stable slug (e.g., `cpcb-naqi-advisories-v1`) |
| `title` | `string` | Yes | Short citation title |
| `topic` | `string` | Yes | `"aqi_health"` \| `"indoor_air"` \| `"cooking_ventilation"` \| `"hepa_filtration"` \| `"masks"` \| `"children_elderly"` \| `"commute_sustainability"` \| `"medical_escalation"` |
| `applicableRiskTiers` | `string[]` | Yes | e.g., `["Poor", "Very Poor", "Severe"]` or `["All"]` |
| `content` | `string` | Yes | Concise, verified guidance text (150–400 words) |
| `sourceAuthority` | `string` | Yes | e.g., `"CPCB India"`, `"WHO Air Quality Guidelines"`, `"US EPA Indoor Air Quality"` |
| `sourceUrl` | `string` | No | Reference URL |
| `version` | `string` | Yes | Document revision tag |
| `updatedAt` | `timestamp` | Yes | Last verified date |

---

### 2.3 `translation_cache/{cacheKey}`
Admin-SDK-only shared translation cache for multilingual Indian language strings (denied to all client reads/writes via catch-all deny rule).

---

## 3. Per-User Subtree (`users/{userId}/...`)

### 3.1 `users/{userId}`
Stores primary account settings and active location preference. Document ID equals Firebase Auth `uid`.

| Field | Type | Required | Description |
|---|---|---|---|
| `uid` | `string` | Yes | Firebase Auth UID (immutable) |
| `displayName` | `string` | Yes | User display name (max 100 chars) |
| `email` | `string` | Yes | Account email |
| `defaultFamilyId` | `string \| null` | No | Active `users/{userId}/families/{familyId}` reference |
| `primaryLocation` | `map \| null` | No | `{ locationId, city, state, country, lat, lng, label }` |
| `aqiScalePreference` | `string` | Yes | Default `"CPCB_NAQI"` (`"CPCB_NAQI"` \| `"US_EPA"`) |
| `onboardingCompleted` | `boolean` | Yes | `false` until location + initial profile saved |
| `createdAt` | `timestamp` | Yes | Server timestamp (immutable) |
| `updatedAt` | `timestamp` | Yes | Server timestamp |

---

### 3.2 `users/{userId}/families/{familyId}` & `.../members/{memberId}`

#### Subcollection: `users/{userId}/families/{familyId}`
Stores household-level lifestyle, commute, indoor air equipment, and indoor questionnaire baseline.

| Field | Type | Required | Description |
|---|---|---|---|
| `ownerUserId` | `string` | Yes | Firebase Auth UID of owner (immutable) |
| `householdName` | `string` | Yes | e.g., `"Sharma Family"` (max 80 chars) |
| `location` | `map` | Yes | `{ locationId, city, state?, country?, lat, lng, label }` |
| `transportationHabits` | `map` | Yes | `{ primaryMode, dailyCommuteKm, vehicleFuelType, occupancy }` (`primaryMode`: `"personal_car"` \| `"two_wheeler"` \| `"carpool"` \| `"public_transit"` \| `"walk_cycle"` \| `"wfh"`) |
| `exercisePreferences` | `map` | Yes | `{ prefersOutdoor, preferredWindow, activityType }` |
| `indoorEquipment` | `map` | Yes | `{ hasHepaPurifier, purifierRoomsCount, hasKitchenExhaust, hasCrossVentilation, hasN95Masks, indoorSmokingPresent }` |
| `indoorQuestionnaire` | `map \| null` | No | Latest Module 4 questionnaire answers (`cookingFuel`, `incenseOrDhoop`, `dustFrequency`, `windowSealing`, `completedAt`) |
| `createdAt` | `timestamp` | Yes | Immutable |
| `updatedAt` | `timestamp` | Yes | Updated on profile edit |

#### Nested Subcollection: `users/{userId}/families/{familyId}/members/{memberId}`
Stores individual household members for personalized risk modifiers.

| Field | Type | Required | Description |
|---|---|---|---|
| `ownerUserId` | `string` | Yes | Owner UID (immutable) |
| `nickname` | `string` | Yes | Display label (e.g., `"Parent 1"`, `"Child"`, max 60 chars) |
| `role` | `string` | Yes | `"working_adult"` \| `"child_school"` \| `"child_toddler"` \| `"elderly"` \| `"homemaker"` \| `"other"` |
| `ageGroup` | `string` | Yes | `"0_5"` \| `"6_12"` \| `"13_17"` \| `"18_45"` \| `"46_60"` \| `"60_plus"` |
| `schedule` | `map \| null` | No | `{ leaveHomeTime, returnHomeTime, outdoorPlayOrExerciseTime }` (HH:MM strings) |
| `commuteMode` | `string \| null` | No | Optional member-specific commute mode |
| `optionalHealthProfile` | `map \| null` | No | **Optional & Private**: `{ hasRespiratorySensitivity: bool, hasCardiacSensitivity: bool, isPregnant: bool, notes?: string (max 200 chars) }`. Never logged; used only to apply conservative general guidance. |
| `createdAt` | `timestamp` | Yes | Immutable |
| `updatedAt` | `timestamp` | Yes | Updated on edit |

---

### 3.3 `users/{userId}/daily_plans/{planDate}_{locationId}`
Stores AI-generated personalized clean-air daily routines (PRD Module 3). Using the deterministic document ID `{planDate}_{locationId}` enables O(1) direct `getDoc()` reads on both client and backend with zero composite indexes.

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | Owner UID (immutable) |
| `familyId` | `string` | Yes | Family profile used |
| `locationId` | `string` | Yes | Location used |
| `planDate` | `string` | Yes | `YYYY-MM-DD` (user local date) |
| `environmentalSnapshot` | `map` | Yes | Exact AQI, PM2.5, PM10, weather, `observedAt`, `source`, `freshnessStatus` used to generate the plan |
| `riskAssessment` | `map` | Yes | Deterministic output from Node 3 (`severityTier`, `sensitiveGroupsPresent`, `constraints`) |
| `sections` | `map` | Yes | `{ morning: RecommendationItem[], afternoon: RecommendationItem[], evening: RecommendationItem[] }` |
| `completedItemIds` | `string[]` | Yes | Array of `itemId` strings toggled complete by the user |
| `fallbackMode` | `boolean` | Yes | `true` if generated via deterministic fallback |
| `citations` | `array` | Yes | List of `{ docId, title, sourceAuthority }` from `knowledge_base` |
| `createdAt` | `timestamp` | Yes | Server timestamp |

Each `RecommendationItem`:
- `itemId`: `string`
- `title`: `string`
- `priority`: `"high"` | `"medium"` | `"low"`
- `category`: `"outdoor_activity"` | `"commute"` | `"indoor_air"` | `"sustainability"` | `"health_precaution"`
- `targetMembers`: `string[]` (roles/nicknames, e.g., `["School-going child", "Working parents"]`)
- `whatToDo`: `string`
- `why`: `string`
- `alternative`: `string`
- `supportingData`: `string`

---

### 3.4 `users/{userId}/chat_sessions/{sessionId}` & `.../messages/{messageId}`

#### Subcollection: `users/{userId}/chat_sessions/{sessionId}`
| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | Owner UID (immutable) |
| `familyId` | `string \| null` | No | Associated family ID |
| `locationId` | `string \| null` | No | Active location context |
| `title` | `string` | Yes | Auto-generated short topic title |
| `createdAt` | `timestamp` | Yes | Immutable |
| `updatedAt` | `timestamp` | Yes | Updated on each new message |

#### Nested Subcollection: `users/{userId}/chat_sessions/{sessionId}/messages/{messageId}`
| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | Owner UID (immutable) |
| `role` | `string` | Yes | `"user"` \| `"assistant"` |
| `content` | `string` | Yes | Plain-language message text |
| `structuredGuidance` | `map \| null` | No | Optional structured summary (key takeaways, follow-up action chips) |
| `environmentalSnapshot` | `map \| null` | No | Snapshot of AQI/freshness referenced in assistant reply |
| `citations` | `array` | No | Referenced `knowledge_base` sources (`docId`, `title`, `sourceAuthority`) |
| `fallbackMode` | `boolean` | No | `true` if deterministic fallback used |
| `createdAt` | `timestamp` | Yes | Server timestamp |

---

### 3.5 `users/{userId}/impact_logs/{logId}`
Stores logged sustainable actions AND exposure-protection actions — keeping **emissions avoided** and **exposure reduction** strictly separate (PRD §6 Module 5).

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | Owner UID (immutable) |
| `familyId` | `string \| null` | No | Associated family ID |
| `actionType` | `string` | Yes | `"carpool"` \| `"public_transit"` \| `"walk_cycle"` \| `"wfh"` \| `"energy_saving"` \| `"indoor_exercise_swap"` \| `"hepa_purifier_use"` |
| `impactDomain` | `string` | Yes | `"emissions_reduction"` \| `"exposure_reduction"` (strictly separated) |
| `title` | `string` | Yes | Human-readable action summary |
| `inputs` | `map` | Yes | e.g., `{ distanceKm, baselineMode, alternativeMode, occupancy }` or `{ durationMinutes, aqiAtTime }` |
| `estimatedCo2AvoidedKg` | `number \| null` | No | Populated ONLY when `impactDomain == "emissions_reduction"`; `null` for exposure-only actions |
| `calculationAssumptions` | `map \| null` | No | `{ formula, baselineFactorKgPerKm, alternativeFactorKgPerKm, factorSource, isEstimate: true }` |
| `exposureContext` | `map \| null` | No | Populated when `impactDomain == "exposure_reduction"` (`aqiAtTime`, `activityReplaced`) |
| `loggedDate` | `string` | Yes | `YYYY-MM-DD` (user local date for weekly aggregation) |
| `createdAt` | `timestamp` | Yes | Server timestamp (immutable) |

---

### 3.6 `users/{userId}/saved_cities/{locationId}`
Lightweight per-user pinned/favorite cities for quick switching in the Location Picker. References the shared `air_quality/{locationId}` cache without duplicating AQI/weather payloads.

| Field | Type | Required | Description |
|---|---|---|---|
| `locationId` | `string` | Yes | Normalized location key (immutable, matches document ID) |
| `city` | `string` | Yes | City name (1–100 chars) |
| `state` | `string \| null` | No | State/region (0–100 chars) |
| `country` | `string \| null` | No | Country name (0–100 chars) |
| `lat` | `number` | Yes | Latitude (`-90..90`) |
| `lng` | `number` | Yes | Longitude (`-180..180`) |
| `label` | `string` | Yes | Display label (1–160 chars) |
| `nickname` | `string \| null` | No | Optional user nickname (e.g., `"Home"`, `"Office"`, max 40 chars) |
| `createdAt` | `timestamp` | Yes | Immutable |
| `updatedAt` | `timestamp` | Yes | Updated when pinned or edited |

---

### 3.7 `users/{userId}/private/usage`
Admin-SDK-only lifetime account quota & burst rate-limit counters (read via authenticated `get_user_usage` callable; all direct client reads and writes are denied by Firestore Security Rules).

| Field | Type | Required | Description |
|---|---|---|---|
| `counts` | `map` | Yes | Lifetime feature usage counts (`chat_message`, `daily_plan`, `indoor_assessment`, `family_profile_parse`, `impact_log`) |
| `burstMinuteKey` | `string` | No | Current UTC minute bucket (`YYYY-MM-DDTHH:MM`) |
| `burstCount` | `number` | No | AI requests made in current UTC minute |
| `updatedAt` | `timestamp` | Yes | Last counter update |

---

## 4. Required Composite Indexes (`firestore.indexes.json`)

Because user-owned queries are scoped under `users/{userId}/...` (requiring only single-field auto-indexes like `orderBy('updatedAt', 'desc')` or O(1) `getDoc()`), only one composite index is needed:

| Collection | Fields (Order) | Query Purpose |
|---|---|---|
| `knowledge_base` | `topic` (ASC), `applicableRiskTiers` (ARRAY_CONTAINS) | Filtered RAG lookup by topic & risk tier |

---

## 5. Security Access Matrix (`firestore.rules`)

All per-user subcollections authorize purely via `request.auth.uid == userId` on the document path (**zero billable `get()`/`exists()` rule reads**).

| Collection | Client Read | Client Create | Client Update | Client Delete | Server (Admin SDK) |
|---|---|---|---|---|---|
| `air_quality/{locationId}` (+ `forecasts`) | Any signed-in user | Deny | Deny | Deny | Full |
| `knowledge_base/{documentId}` | Any signed-in user | Deny | Deny | Deny | Full |
| `translation_cache/{key}` | Deny | Deny | Deny | Deny | Full |
| `users/{userId}` | Owner (`uid == userId`) | Owner | Owner (immutable `uid`, `createdAt`) | Deny | Full |
| `users/{userId}/families/{familyId}` | Owner | Owner | Owner (immutable `ownerUserId`, `createdAt`) | Owner | Full |
| `users/{userId}/families/{familyId}/members/{memberId}` | Owner | Owner | Owner (immutable `ownerUserId`, `createdAt`) | Owner | Full |
| `users/{userId}/daily_plans/{planId}` | Owner | Deny (server only) | Owner: ONLY `completedItemIds` field | Deny | Full |
| `users/{userId}/chat_sessions/{sessionId}` | Owner | Owner | Owner (`title`, `updatedAt` only) | Owner | Full |
| `users/{userId}/chat_sessions/{sessionId}/messages/{messageId}` | Owner | Deny (server writes both turns) | Deny | Deny | Full |
| `users/{userId}/impact_logs/{logId}` | Owner | Deny (server calculates & writes) | Deny | Owner | Full |
| `users/{userId}/saved_cities/{locationId}` | Owner | Owner | Owner (immutable `locationId`, `createdAt`) | Owner | Full |
| `users/{userId}/private/{docId}` | Deny | Deny | Deny | Deny | Full |
