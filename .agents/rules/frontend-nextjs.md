---
trigger: glob
globs: "frontend/**/*"
description: "Next.js App Router, React, TypeScript, Tailwind CSS, Shadcn UI, Recharts, PWA, and client security rules for the BreatheWise AI frontend."
---

# Frontend Engineering Rules (`frontend/`)

Follow [docs/UI_UX_SPEC.md](../../docs/UI_UX_SPEC.md) and [docs/API_SPEC.md](../../docs/API_SPEC.md) whenever building or editing files in `frontend/`.

## 1. Architecture & Stack Conventions

- **Next.js App Router**: Use Server Components by default; add `'use client'` only for interactive components (forms, Recharts charts, chat composer, Auth listeners, tabs).
- **Senior Clean Structure & Reusability**: Organize code cleanly into `config/` (app routes, AQI visual token maps, constants), `lib/` (Firebase init, reusable authenticated API client, date/AQI formatters), `services/` (typed API & Firestore client functions), `hooks/` (reusable stateful hooks), `components/ui/` (Shadcn primitives), `components/shared/` (reusable AQI badge, freshness banner, error/empty/loading states), and `types/` (shared DTOs). Avoid duplicating fetch logic or formatting helpers across pages.
- **Strict TypeScript**: No `any` types. Define shared domain DTOs (AQI readings, FamilyProfile, DailyPlan, ChatMessage, ImpactSummary) matching [docs/API_SPEC.md](../../docs/API_SPEC.md) and [docs/DATA_MODEL.md](../../docs/DATA_MODEL.md).
- **UI & Styling**: Use Tailwind CSS + Shadcn UI primitives (`Card`, `Badge`, `Button`, `Tabs`, `Sheet`, `Alert`, `Skeleton`, `Dialog`, `Accordion`). Use **Recharts** for forecast trends and weekly impact charts with responsive containers.
- **Mobile-First & PWA**: Design for `375px` mobile viewports first, scaling cleanly to desktop (`1280px+`). Maintain PWA manifest, icons, and graceful offline/stale-data messaging.

## 2. Client Security & Secret Hygiene

- **Zero server secrets in client code**: NEVER store or reference `GEMINI_API_KEY`, WAQI tokens, CPCB API keys, or Firebase Admin credentials in `frontend/` or any `NEXT_PUBLIC_*` variable.
- **Authenticated API calls**: Attach the current Firebase Auth user's fresh ID token (`Authorization: Bearer <idToken>`) on every request to protected Cloud Functions endpoints.
- **Privacy in UI**: Clearly mark health-related family profile fields as **Optional & Private**. Never dump family profile or health notes into `console.log` or URL query strings.

## 3. Mandatory UI Data & Safety States

Every data-driven screen/component MUST explicitly handle all five states:
1. **Loading**: Skeleton loaders (never blank white screens).
2. **Fresh Data**: Show value + unit + source attribution + relative `Last updated` timestamp.
3. **Stale Data**: Render an explicit amber warning banner/badge (*"Showing cached data from X min ago — live station temporarily unreachable"*).
4. **Unavailable Data**: Show clear unavailable notice (never display fake `0` AQI or fabricated forecast windows).
5. **Error / Fallback**: User-friendly recovery action (`Retry`) and graceful fallback content when AI generation fails.

## 4. Accessibility & Visual Clarity

- Never convey AQI severity by color alone: always pair color tokens with the CPCB category label (e.g., `Very Poor`) and an icon/indicator.
- Keep **Estimated CO2 Avoided** and **Exposure-Protection Actions** visually separated in `My Impact`, with an expandable/popover **"How this is estimated"** disclosure.
- Keep a persistent, unobtrusive medical disclaimer in the AI Assistant and Daily Planner views.
