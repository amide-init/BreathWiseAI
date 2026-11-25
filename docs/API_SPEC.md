# API & External Integrations Specification — BreatheWise AI

> Derived from [PRD.md](../PRD.md) §8.2, §9, and §12. Defines all backend Cloud Functions Gen 2 endpoints, request/response JSON contracts, error conventions, and external provider integration rules.

---

## 1. Backend API Conventions

- **Runtime & Transport Priority**: Firebase Cloud Functions Gen 2 (Python, `asia-south1`) — **always prioritize `@https_fn.on_call` Callable Functions** invoked from the client via Firebase `httpsCallable` (`src/lib/callable-client.ts`).
- **Authentication**: Firebase Callable Functions automatically verify the signed-in user's ID token and populate `req.auth.uid` on the server (`require_callable_auth`). Never trust a client-supplied `userId` for authorization.
- **Error Handling**: All domain `AppError` / Pydantic validation failures are mapped centrally in `app/utils/callable_utils.py` to typed `https_fn.HttpsError` codes (`UNAUTHENTICATED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `NOT_FOUND`, `RESOURCE_EXHAUSTED`, `UNAVAILABLE`, `INTERNAL`) with a `requestId` in `details`.

---

## 2. Backend Callable Function Catalog

| Callable Name (`on_call`) | Auth | Purpose | PRD Ref |
|---|---|---|---|
| `health_check` | Public | Operational health & service version check | — |
| `search_locations` | Required | Geocode / search supported cities & return normalized `locationId` | FR-02 |
| `get_air_quality` | Required | Cache-first current AQI, PM2.5/PM10, weather, forecasts & freshness | FR-03, FR-04 |
| `generate_daily_plan` | Required | Run 5-node LangGraph workflow for Morning/Afternoon/Evening plan | FR-06, FR-09 |
| `assess_indoor_air` | Required | Evaluate Module 4 indoor questionnaire & return estimated guidance | FR-07 |
| `send_chat_message` | Required | Run 5-node LangGraph conversational assistant with RAG & history | FR-08, FR-11 |
| `log_impact_action` | Required | Log sustainable or exposure-protection action with server-side math | FR-09, FR-10 |
| `get_impact_summary` | Required | Return 7-day & cumulative totals (emissions & exposure separated) | FR-10 |

> **Direct Firestore Operations (Client SDK + `firestore.rules`)**: User profile updates (`users/{uid}`), Family & Member CRUD (`families/{familyId}`), toggling completed items on `daily_plans/{planId}`, and reading `chat_sessions` / `daily_plans` / `impact_logs` history use Firestore directly for low latency and real-time updates.

---

## 3. Endpoint Contracts

### 3.1 `GET /api/v1/locations/search?q=<query>`
- **Query Params**: `q` (min 2 chars, max 80 chars).
- **Response (`200 OK`)**:
  ```json
  {
    "results": [
      {
        "locationId": "in-new-delhi-28.61-77.21",
        "city": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "label": "New Delhi, Delhi, India",
        "lat": 28.6139,
        "lng": 77.2090
      }
    ]
  }
  ```

### 3.2 `GET /api/v1/air-quality?locationId=<id>&lat=<lat>&lng=<lng>&label=<label>`
- **Response (`200 OK`)**:
  ```json
  {
    "locationId": "in-new-delhi-28.61-77.21",
    "locationName": "New Delhi, Delhi, India",
    "current": {
      "aqi": 342,
      "aqiScale": "CPCB_NAQI",
      "category": "Very Poor",
      "dominantPollutant": "pm25",
      "healthGuidance": "Air quality is currently Very Poor. Avoid strenuous outdoor exercise and minimize prolonged outdoor exposure.",
      "readings": [
        {
          "location": "New Delhi, Delhi, India",
          "pollutant": "PM2.5",
          "value": 176.4,
          "unit": "µg/m³",
          "observedAt": "2026-11-24T13:30:00Z",
          "source": "WAQI / CPCB Station",
          "freshnessStatus": "fresh"
        },
        {
          "location": "New Delhi, Delhi, India",
          "pollutant": "PM10",
          "value": 289.0,
          "unit": "µg/m³",
          "observedAt": "2026-11-24T13:30:00Z",
          "source": "WAQI / CPCB Station",
          "freshnessStatus": "fresh"
        }
      ],
      "observedAt": "2026-11-24T13:30:00Z",
      "source": "WAQI / CPCB Station",
      "freshnessStatus": "fresh"
    },
    "weather": {
      "tempC": 18.5,
      "humidityPct": 72,
      "windSpeedKmh": 6.2,
      "windDirectionDeg": 310,
      "observedAt": "2026-11-24T13:30:00Z",
      "source": "Open-Meteo",
      "freshnessStatus": "fresh"
    },
    "forecasts": [
      {
        "forecastFor": "2026-11-24T15:00:00Z",
        "pm25": 162.0,
        "pm10": 265.0,
        "estimatedNaqi": 331,
        "tempC": 19.0,
        "windSpeedKmh": 7.5,
        "source": "Open-Meteo Air Quality Forecast",
        "isForecast": true
      }
    ],
    "fallbackProviderUsed": false
  }
  ```
- **Unavailable / Stale Behavior**: Never return HTTP 500 solely because upstream AQI is down; return `200 OK` with `freshnessStatus: "stale"` (if cached) or `freshnessStatus: "unavailable"` and `aqi: null` / `value: null`.

### 3.3 `POST /api/v1/daily-plan/generate`
- **Request**: `{ "locationId": "in-new-delhi-28.61-77.21", "familyId": "fam_123", "planDate": "2026-11-24", "forceRefresh": false }`
- **Response (`200 OK`)**: Returns persisted `daily_plans/{planId}` document including `environmentalSnapshot`, deterministic `riskAssessment`, `sections` (`morning`, `afternoon`, `evening` items with `whatToDo`, `why`, `alternative`, `supportingData`), `citations`, and `fallbackMode`.

### 3.4 `POST /api/v1/indoor-advisor/assess`
- **Request**:
  ```json
  {
    "familyId": "fam_123",
    "locationId": "in-new-delhi-28.61-77.21",
    "questionnaire": {
      "cookingFuel": "lpg_gas",
      "usesKitchenExhaust": false,
      "hasHepaPurifier": true,
      "indoorSmokingPresent": false,
      "incenseOrDhoopDaily": true,
      "dustCleaningMethod": "dry_broom",
      "windowSealingQuality": "moderate"
    }
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "assessmentBasis": "estimated_questionnaire",
    "disclaimer": "These insights are estimated from your home questionnaire and outdoor AQI — not measured by an indoor air sensor.",
    "estimatedRiskLevel": "elevated",
    "keyIndoorSources": ["Cooking emissions without exhaust", "Daily incense combustion", "Dry sweeping resuspends settled dust"],
    "recommendations": [
      {
        "category": "cooking_ventilation",
        "priority": "high",
        "whatToDo": "Use a kitchen exhaust or crack a window near the stove briefly only while cooking, keeping other rooms sealed.",
        "why": "Gas cooking generates indoor PM2.5 and NO2 that accumulate rapidly when windows are kept closed for smog.",
        "alternative": "Prefer covered pots, electric kettle/induction when available, and run your HEPA purifier in the main living area.",
        "supportingData": "Outdoor AQI 342 (Very Poor) + Questionnaire: LPG cooking without exhaust"
      }
    ],
    "citations": [{ "docId": "epa-indoor-cooking-v1", "title": "Reducing Indoor Cooking & Combustion Pollution", "sourceAuthority": "US EPA Indoor Air Quality" }],
    "fallbackMode": false
  }
  ```

### 3.5 `POST /api/v1/chat/message`
- **Request**: `{ "sessionId": "sess_123" | null, "familyId": "fam_123" | null, "locationId": "in-new-delhi-28.61-77.21", "message": "Can my child play outside today?" }`
- **Response (`200 OK`)**: Returns `sessionId`, `messageId`, `reply` (`content`, `followUpSuggestions`, `citations`, `environmentalSnapshot`, `medicalDisclaimerShown`, `fallbackMode`).

### 3.6 `POST /api/v1/impact/log` & `GET /api/v1/impact/summary?days=7`
- **`POST /api/v1/impact/log` Request**:
  - Emissions action example: `{ "actionType": "carpool", "impactDomain": "emissions_reduction", "inputs": { "distanceKm": 18, "baselineMode": "petrol_car_solo", "occupancy": 3 }, "loggedDate": "2026-11-24" }`
  - Exposure action example: `{ "actionType": "indoor_exercise_swap", "impactDomain": "exposure_reduction", "inputs": { "durationMinutes": 40, "aqiAtTime": 342, "activityReplaced": "outdoor_morning_walk" }, "loggedDate": "2026-11-24" }`
- **`GET /api/v1/impact/summary` Response (`200 OK`)**:
  - Returns two explicitly separated top-level objects:
    - `emissionsImpact`: `{ totalEstimatedCo2AvoidedKg, actionsCount, dailySeries[], assumptionsSummary, isEstimate: true }`
    - `exposureProtection`: `{ actionsCount, highAqiActionsAvoided, dailySeries[] }`

---

## 4. External API Integration Matrix

| Provider | Purpose | Priority / Role | Auth / Secret | Cache TTL | Attribution & Fallback |
|---|---|---|---|---|---|
| **WAQI API / data.gov.in CPCB** | Real-time Indian CPCB station AQI, PM2.5, PM10 | Primary AQI | Server secret (`WAQI_API_TOKEN` / `CPCB_API_KEY`) | `30 min` | Display station & CPCB/WAQI attribution; fall back to Open-Meteo AQ on error/timeout |
| **Open-Meteo Weather API** | Temp, humidity, wind speed & direction | Primary Weather | None (free non-commercial) | `30 min` | Display `"Open-Meteo"` attribution |
| **Open-Meteo Air Quality API** | Hourly PM2.5/PM10 forecast + AQI fallback | Primary Forecast & AQI Fallback | None | `3 hours` (forecast) / `30 min` (fallback) | Compute CPCB NAQI deterministically from PM2.5/PM10 when used as fallback; clearly label `"Estimated from Open-Meteo"` |
| **Google Maps Geocoding / Places** | City/locality search & lat/lng lookup | Primary Location | Server secret (`GOOGLE_MAPS_SERVER_KEY`) | `24 hours` (city lookup) | Fallback to built-in curated list of top Indian metro cities if quota/network unavailable |
| **Google Gemini API** | Node 4 structured recommendations & chat | Primary LLM | Server secret (`GEMINI_API_KEY`) | N/A | Bounded 20s timeout; deterministic fallback response on failure |

---

## 5. Mandatory Environmental Data Freshness Contract

Every reading returned by `/api/v1/air-quality` and stored in `environmentalSnapshot` MUST include all seven PRD §9 attributes:

1. `location` — City / station display label
2. `pollutant` — e.g., `AQI`, `PM2.5`, `PM10`
3. `value` — Numeric value or `null` (never synthetic `0` on failure)
4. `unit` — `CPCB NAQI`, `µg/m³`, `°C`, `%`, `km/h`
5. `observedAt` — ISO-8601 UTC timestamp from upstream source
6. `source` — Provider/station name
7. `freshnessStatus`:
   - `fresh`: Observation age ≤ `30 min` (or up to `60 min` if station reports hourly and fetch succeeded within `30 min`)
   - `stale`: Serving cached reading older than threshold because live fetch failed
   - `unavailable`: No live or cached observation available
