# Product Requirements Document (PRD)
# BreatheWise AI
**An AI-powered Personal Clean-Air Assistant**

| Document attribute | Details |
|---|---|
| Product | BreatheWise AI |
| Version | 1.0 |
| Project type | GenAI Hackathon MVP |
| Development timeline | 10 days |
| Platform | Responsive Web Application / PWA |
| Frontend | Vite + React + TypeScript |
| Backend | Firebase Cloud Functions Gen 2 |
| Database | Cloud Firestore |
| AI orchestration | LangGraph |
| AI model | Google Gemini |
| Authentication | Firebase Authentication |

---

## 1. Executive Summary

BreatheWise AI is a GenAI-powered personal environmental assistant designed to help families and communities navigate severe winter smog and urban air pollution.

The application combines real-time air-quality information, weather conditions, family profiles and lifestyle preferences to generate personalized daily recommendations.

Instead of simply displaying pollution measurements, BreatheWise AI translates environmental information into practical everyday decisions.

Users can understand their local air quality, receive personalized daily routines, improve indoor air quality, explore sustainable alternatives and track their estimated environmental impact.

The application aims to make environmental intelligence actionable, accessible and personalized.

## 2. Problem Statement

Urban air pollution and winter smog are significant environmental and public-health challenges.

Families often lack actionable information to make informed decisions about their daily activities during periods of poor air quality.

Existing air-quality applications primarily focus on reporting AQI and pollutant concentrations. They do not adequately address the following questions:

- Is it appropriate to exercise outdoors today?
- When should children play outside?
- How can families reduce exposure to polluted environments?
- How can indoor air quality be improved?
- What are the sustainable alternatives to everyday activities?
- How much environmental impact can individual lifestyle changes create?

### Core problem

People have access to pollution information but lack personalized guidance to convert that information into practical everyday actions.

## 3. Product Vision

To make every family capable of making smarter, healthier and more sustainable decisions using accessible environmental intelligence.

### Product mission

Build an AI assistant that connects environmental data with individual lifestyles and helps people take meaningful action against air pollution.

## 4. Goals and Objectives

### Primary goals

1. Provide location-based air-quality information.
2. Generate personalized clean-air daily plans.
3. Help families improve indoor air quality.
4. Recommend sustainable lifestyle alternatives.
5. Explain the environmental impact of everyday decisions.
6. Provide a conversational AI interface for environmental guidance.

### Success criteria

The MVP should demonstrate:

- Successful retrieval of real environmental data.
- Personalized recommendations based on user profiles.
- AI-generated daily action plans.
- Grounded responses with supporting information.
- Environmental impact calculations with transparent assumptions.
- A complete working user journey.

## 5. Target Audience

### Primary users

**Families living in highly polluted urban areas**

People who want practical guidance to protect their families during periods of poor air quality.

### Secondary users

- Working professionals who commute daily.
- Parents with school-going children.
- Elderly people and their caregivers.
- People who exercise outdoors.
- Environmentally conscious individuals.
- Community organizations and schools.

## 6. Product Scope

The MVP will contain six primary modules.

### Module 1: Air Quality Intelligence Dashboard

**Objective:** Provide users with an understandable overview of their local environmental conditions.

Features:

- Location selection and location-based AQI retrieval.
- Current AQI.
- PM2.5 and PM10 concentrations.
- Temperature and humidity.
- Wind speed and direction.
- Available air-quality forecasts.
- Pollution category and health guidance.
- Data source and last-updated timestamp.

The dashboard should explain what the pollution measurements mean for everyday activities.

**Example:**

"Air quality is currently very poor. Avoid strenuous outdoor exercise and reduce unnecessary outdoor exposure. Follow local health advisories."

Requirements:

- Display actual data from an external environmental API.
- Show unavailable data clearly rather than inventing measurements.
- Distinguish current readings from forecasts.
- Support manual location selection.

### Module 2: Family Profile and Personalization

**Objective:** Understand the user's family composition and lifestyle to generate relevant recommendations.

Features:

- User profile.
- Location and city.
- Family member profiles.
- Age groups.
- Lifestyle preferences.
- Work and school schedules.
- Exercise preferences.
- Transportation habits.
- Indoor air-quality equipment availability.

Example profile:

- Parent: Working professional.
- Child: School-going.
- Commute: Personal vehicle.
- Exercise: Outdoor morning walk.
- Air purifier: Available.

The system uses this information to personalize recommendations.

Health-related information should be optional, securely stored and used only to tailor appropriate general guidance.

### Module 3: AI Personalized Daily Planner

**Objective:** Generate daily clean-air routines based on environmental conditions and user preferences.

Features:

- Personalized morning recommendations.
- Afternoon activity recommendations.
- Evening recommendations.
- Outdoor activity guidance.
- Indoor alternatives.
- School and office commute suggestions.
- Explanation for every recommendation.
- Priority indicators.

Example:

**Morning**
- Avoid strenuous outdoor exercise during high pollution.
- Consider indoor exercise.
- Check air quality before leaving home.

**Afternoon**
- Reduce unnecessary outdoor exposure.
- Use appropriate indoor filtration if available.

**Evening**
- Prefer indoor family activities if pollution remains elevated.

Every recommendation should include:

1. What should the user do?
2. Why is this recommended?
3. What alternative is available?
4. Which environmental information supports it?

Recommendations must be based on actual readings, forecasts and verified guidance rather than fabricated safe time windows.

### Module 4: Indoor Air Quality Advisor

**Objective:** Help families identify and reduce common indoor pollution sources.

Features:

- Indoor air-quality questionnaire.
- Cooking-related pollution guidance.
- Dust and cleaning recommendations.
- Ventilation recommendations.
- Air purifier guidance.
- Indoor smoking prevention.
- Personalized home improvement suggestions.

Example:

User: "How can I improve indoor air quality during severe smog?"

AI response:

- Reduce outdoor air infiltration when outdoor pollution is high.
- Use an appropriately sized HEPA air purifier.
- Avoid indoor smoking and unnecessary combustion.
- Use kitchen exhaust ventilation when cooking.
- Ventilate when outdoor air quality is suitable.

The application must distinguish between measured indoor air quality and estimated indoor conditions.

### Module 5: Sustainability and Impact Tracker

**Objective:** Encourage users to adopt lower-emission lifestyle choices.

Features:

- Sustainable commuting suggestions.
- Carpool recommendations.
- Public transportation alternatives.
- Walking and cycling suggestions when conditions permit.
- Energy-saving recommendations.
- Daily sustainable action tracking.
- Estimated CO2 emissions avoided.
- Weekly impact summary.

Example:

Current behaviour: Individual car commute.

Suggested alternative: Carpool with two colleagues.

The system estimates the emissions difference using distance, vehicle type, occupancy and suitable emission factors.

Impact metrics must clearly identify estimates and assumptions.

Personal exposure reduction and environmental emissions reduction must be presented as separate measurements.

### Module 6: Conversational AI Assistant

**Objective:** Allow users to interact with BreatheWise using natural language.

Example questions:

- What is the current air quality in my location?
- Can my child play outside today?
- Should I go jogging this morning?
- How can I improve indoor air quality?
- What should I change in my daily routine?
- How can I reduce pollution from my commute?

Capabilities:

- Understand the user's question.
- Retrieve relevant environmental information.
- Access family preferences.
- Retrieve verified knowledge-base content.
- Generate contextual recommendations.
- Explain recommendations in simple language.
- Provide source references where appropriate.

The assistant must not diagnose diseases or replace professional medical advice.

---

## 7. AI Architecture and Agent Workflow

### 7.1 AI Architecture

The application will use LangGraph to orchestrate environmental data retrieval, contextual analysis and personalized recommendations.

The system will use a combination of deterministic rules, external data APIs, retrieval-augmented generation and an LLM.

### 7.2 LangGraph Workflow

The primary workflow will contain five nodes.

**Node 1: Context Agent**

Responsibilities:
- Retrieve user profile from Firestore.
- Retrieve family preferences.
- Understand lifestyle and activity schedules.
- Prepare user context.

**Node 2: Environment Agent**

Responsibilities:
- Retrieve current AQI.
- Retrieve PM2.5 and PM10.
- Retrieve weather conditions.
- Retrieve available forecasts.
- Normalize environmental information.

**Node 3: Risk Assessment Node**

Responsibilities:
- Evaluate pollutant levels.
- Apply relevant health guidance.
- Identify potential exposure concerns.
- Determine suitable recommendation constraints.

Risk assessment should use deterministic rules and verified guidance. The LLM must not independently determine medical risk.

**Node 4: Recommendation Agent**

Responsibilities:
- Generate personalized daily routines.
- Recommend indoor activities.
- Suggest sustainable alternatives.
- Explain the reasoning behind recommendations.
- Generate structured responses using Gemini.

**Node 5: Validation Node**

Responsibilities:
- Validate the response schema.
- Check that recommendations are supported by retrieved information.
- Check for unsafe or contradictory recommendations.
- Ensure environmental readings are not fabricated.
- Return validated recommendations.

### 7.3 AI Technology

- LangGraph: Workflow orchestration.
- Gemini: Language understanding and recommendation generation.
- Pydantic: Structured AI response validation.
- RAG: Retrieval of trusted environmental and health guidance.
- Firestore: User context and conversation persistence.

### 7.4 AI Safety Requirements

- Never invent AQI measurements.
- Never claim that a specific time is safe without supporting forecast data.
- Never provide medical diagnosis.
- Avoid unsupported health claims.
- Clearly communicate uncertainty and stale data.
- Use verified knowledge for health-related guidance.
- Provide emergency or medical escalation guidance where appropriate.

---

## 8. Technical Architecture

### 8.1 Frontend

**Technology:**
- Vite + React + React Router.
- React.
- TypeScript.
- Tailwind CSS.
- Shadcn UI.
- Recharts.

Responsibilities:
- User onboarding.
- Authentication.
- Dashboard.
- Family profile management.
- AI chat interface.
- Daily recommendation display.
- Impact dashboard.

The application will use a mobile-first responsive design and support PWA installation where feasible.

### 8.2 Backend

**Technology:**
- Firebase Cloud Functions Gen 2.
- Python for LangGraph orchestration.
- Firebase Admin SDK.
- Pydantic for data validation.

Responsibilities:
- Secure API endpoints.
- Environmental data retrieval.
- AI workflow execution.
- Recommendation generation.
- Firestore operations.
- Impact calculation.

### 8.3 Database

**Technology:** Cloud Firestore.

Proposed collections:

```text
users/
  {userId}

families/
  {familyId}
  members/
    {memberId}

air_quality/
  {locationId}
  current
  forecasts/

daily_plans/
  {planId}

chat_sessions/
  {sessionId}
  messages/
    {messageId}

impact_logs/
  {logId}

knowledge_base/
  {documentId}
```

### 8.4 Firebase Services

| Service | Purpose |
|---|---|
| Firebase Authentication | User authentication |
| Cloud Firestore | Application database |
| Cloud Functions Gen 2 | Backend APIs and LangGraph |
| Firebase Hosting | Frontend SPA & PWA hosting |
| Firebase Cloud Messaging | Notifications |
| Cloud Storage | Optional document storage |

---

## 9. External API Integrations

The MVP will integrate environmental data providers.

| Integration | Purpose |
|---|---|
| CPCB / compatible AQI provider | Air-quality measurements |
| Open-Meteo | Weather information |
| Air-quality forecast provider | Pollution forecast |
| Google Maps | Location and optional route information |
| Gemini API | AI generation |

API availability, licensing, attribution requirements and rate limits must be verified before integration.

The application should use a primary AQI source and a fallback where feasible.

### Data freshness

Every environmental reading should contain:

- Location.
- Pollutant.
- Measurement value.
- Unit.
- Observation timestamp.
- Source.
- Data freshness status.

The system must not treat an old measurement as a current reading.

---

## 10. Application Screens

The MVP will include five primary screens.

### Screen 1: Home Dashboard

Components:
- Current AQI card.
- PM2.5 and PM10 readings.
- Weather information.
- Pollution category.
- Health guidance.
- Today's recommended actions.
- Quick access to AI assistant.

### Screen 2: Family Profile

Components:
- Personal details.
- Location.
- Family members.
- Lifestyle preferences.
- Work and school schedule.
- Transportation habits.
- Indoor air equipment.

### Screen 3: Daily Clean-Air Planner

Components:
- Morning recommendations.
- Afternoon recommendations.
- Evening recommendations.
- Priority indicators.
- Recommendation explanations.
- Mark-as-completed functionality.

### Screen 4: AI Assistant

Components:
- Chat interface.
- Suggested questions.
- Context-aware answers.
- Source references.
- Recommended follow-up actions.

### Screen 5: My Impact

Components:
- Sustainable actions completed.
- Estimated emissions avoided.
- Exposure-related activity indicators.
- Weekly progress.
- Personal achievements.

---

## 11. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | User registration and login | P0 |
| FR-02 | Location selection | P0 |
| FR-03 | Retrieve real-time AQI | P0 |
| FR-04 | Display pollutant measurements | P0 |
| FR-05 | Family profile management | P0 |
| FR-06 | Generate AI daily planner | P0 |
| FR-07 | Generate indoor air recommendations | P0 |
| FR-08 | Conversational AI assistant | P0 |
| FR-09 | Sustainable alternatives | P0 |
| FR-10 | Environmental impact calculation | P1 |
| FR-11 | Retrieve supporting knowledge | P1 |
| FR-12 | Pollution notifications | P2 |
| FR-13 | Community challenges | P2 |

Priority definitions:

- P0: Required for hackathon demonstration.
- P1: Important if development time permits.
- P2: Future enhancements.

---

## 12. Non-Functional Requirements

### Performance
- Dashboard should load quickly.
- Environmental API calls should be cached appropriately.
- AI responses should have reasonable execution time.
- Long-running workflows should have bounded execution.

### Security
- Use Firebase Authentication.
- Enforce Firestore security rules.
- Validate user identity on protected backend endpoints.
- Keep API keys and secrets in secure server-side configuration.
- Do not expose Gemini or environmental provider secrets in frontend code.

### Reliability
- Provide graceful error handling.
- Show unavailable environmental data clearly.
- Use cached data only with an explicit freshness indicator.
- Provide fallback responses when AI generation fails.

### Privacy
- Collect only necessary personal information.
- Keep family profile data private.
- Restrict access to user-owned records.
- Avoid exposing sensitive family information in logs.

---

## 13. Hackathon MVP Scope

The 10-day development period requires strict scope control.

### Must-have features

1. Authentication.
2. Location-based AQI dashboard.
3. Family onboarding.
4. LangGraph recommendation workflow.
5. AI-generated daily planner.
6. Indoor air-quality advisor.
7. Conversational assistant.
8. Basic sustainability recommendations.
9. Impact estimation.

### Optional features

1. Push notifications.
2. Community challenges.
3. Advanced pollution analytics.
4. What-if lifestyle simulator.
5. Indoor air-quality sensor integration.

### Explicitly out of scope

- Training a custom foundation model.
- Building custom IoT hardware.
- Native Android and iOS applications.
- Advanced citywide pollution prediction.
- Full social networking functionality.
- Complex autonomous multi-agent infrastructure.

---

## 14. Ten-Day Development Roadmap

| Day | Deliverable |
|---|---|
| Day 1 | Project setup, UI design and Firebase configuration |
| Day 2 | Authentication, Firestore and AQI integration |
| Day 3 | Family profile and personalization |
| Day 4 | LangGraph workflow and Gemini integration |
| Day 5 | AI daily planner |
| Day 6 | Indoor air advisor and conversational assistant |
| Day 7 | Sustainability and impact tracking |
| Day 8 | Frontend/backend integration and UI refinement |
| Day 9 | Testing, safety validation and deployment |
| Day 10 | Demo preparation, documentation and submission |

---

## 15. Hackathon Demonstration Scenario

The primary demonstration will follow a family living in a highly polluted urban area.

### Scenario

A family has two working parents and one school-going child.

They need to manage:
- Morning exercise.
- School commute.
- Office commute.
- Indoor household activities.
- Evening family activities.

### Demonstration flow

1. Open BreatheWise AI.
2. Select a city with available pollution data.
3. Show current AQI and PM2.5.
4. Create a family profile.
5. Generate the personalized daily clean-air plan.
6. Ask the AI whether the child should play outside.
7. Ask for indoor air-quality improvements.
8. Explore lower-emission commuting alternatives.
9. Track a sustainable action.
10. Display the estimated environmental impact.

The demo should clearly demonstrate the relationship between environmental data, AI reasoning, personalized actions and measurable outcomes.

---

## 16. Success Metrics

The hackathon prototype will be evaluated using the following internal metrics:

| Metric | Target |
|---|---|
| AQI data retrieval | Successful for supported locations |
| Profile personalization | Works for different family profiles |
| Daily plan generation | Successful structured response |
| Recommendation validation | No unsupported critical claims in test scenarios |
| AI assistant | Answers contextual environmental questions |
| Impact tracking | Calculations use transparent assumptions |
| Responsive interface | Usable on desktop and mobile |
| End-to-end demo | Complete without manual database intervention |

These are prototype acceptance targets, not claims of real-world health impact.

---

## 17. Future Product Roadmap

After the hackathon, BreatheWise AI can expand into a broader environmental intelligence platform.

### Phase 2: Advanced Personalization
- Pollution exposure history.
- Advanced forecast-based planning.
- Personalized notification schedules.
- More detailed family recommendations.

### Phase 3: Community Intelligence
- Neighborhood pollution insights.
- Community challenges.
- School awareness programs.
- Community-level sustainable activity tracking.

### Phase 4: IoT Integration
- Indoor air-quality sensors.
- Real-time indoor PM2.5 monitoring.
- Automated indoor/outdoor air-quality comparisons.
- Smart home integrations.

### Phase 5: Environmental Intelligence Platform
- Historical pollution analytics.
- Community trend analysis.
- City-level environmental insights.
- Partnerships with schools and organizations.

---

## 18. Final Product Positioning

**BreatheWise AI is not another AQI monitoring application.**

It is a personalized environmental decision-support assistant.

Traditional applications tell users how polluted their environment is.

BreatheWise AI helps users understand:
- What the pollution means.
- How it affects their daily decisions.
- What practical actions they can take.
- How their choices contribute to a more sustainable environment.

### Final tagline

**BreatheWise AI — Know Your Air. Protect Your Family. Make Every Action Count.**