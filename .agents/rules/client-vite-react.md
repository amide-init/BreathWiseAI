---
trigger: glob
globs: "client/**/*"
description: "Vite, React, TypeScript, React Router, Tailwind CSS, Shadcn UI, Recharts, PWA, and client security rules for the BreatheWise AI client app."
---

# Client App Engineering Rules (`client/`)

Follow [docs/UI_UX_SPEC.md](../../docs/UI_UX_SPEC.md) and [docs/API_SPEC.md](../../docs/API_SPEC.md) whenever building or editing files in `client/`.

## 1. Architecture & Stack Conventions

- **Package Manager (`pnpm` only)**: Always use **`pnpm`** (`pnpm install`, `pnpm add`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`) in `client/`. Never use `npm` or `yarn`, and never commit `package-lock.json` or `yarn.lock` (keep `pnpm-lock.yaml` only).
- **Vite + React + React Router**: Use Vite with strict TypeScript and `react-router-dom` (lazy-loaded route pages where helpful) producing a clean static build (`client/dist`) deployed to Firebase Hosting with SPA rewrites (`** -> /index.html`).
- **Senior Clean Structure & Reusability**: Organize code cleanly into `src/pages/` (route screens), `src/routes/` (router + auth guards), `src/layouts/` (responsive desktop sidebar / mobile bottom nav shell), `src/config/` (route constants, AQI visual token maps, validated `VITE_*` env), `src/lib/` (Firebase init, reusable authenticated API client, date/AQI formatters), `src/services/` (typed API & Firestore client functions), `src/hooks/` (reusable stateful hooks), `src/components/ui/` (Shadcn primitives), `src/components/shared/` (reusable AQI badge, freshness banner, error/empty/loading states), and `src/types/` (shared DTOs). Avoid duplicating fetch logic or formatting helpers across pages.
- **Strict TypeScript**: No `any` types. Define shared domain DTOs (AQI readings, FamilyProfile, DailyPlan, ChatMessage, ImpactSummary) matching [docs/API_SPEC.md](../../docs/API_SPEC.md) and [docs/DATA_MODEL.md](../../docs/DATA_MODEL.md).
- **UI & Styling**: Use Tailwind CSS + Shadcn UI primitives (`Card`, `Badge`, `Button`, `Tabs`, `Sheet`, `Alert`, `Skeleton`, `Dialog`, `Accordion`). Use **Recharts** for forecast trends and weekly impact charts with responsive containers.
- **Mobile-First & PWA**: Design for `375px` mobile viewports first, scaling cleanly to desktop (`1280px+`). Maintain PWA manifest (`vite-plugin-pwa` / `public/manifest.json`), icons, and graceful offline/stale-data messaging.

## 2. Client Security & Secret Hygiene

- **Zero server secrets in client code**: NEVER store or reference `GEMINI_API_KEY`, WAQI tokens, CPCB API keys, or Firebase Admin credentials in `client/` or any `VITE_*` variable.
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
