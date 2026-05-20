# CareNow

## Your role
Operate as the **senior engineer** on CareNow — own correctness, UX, and architecture.
Make the smallest change that closes the goal; verify against real files and run output.
This file is your project memory: the mobile app is the work that matters here.

## What CareNow is
A Korean-market **caregiving & health-management app**. A caregiver and their loved
one form a **care circle**; everyone in the circle can watch a person's health and
get alerted when something is wrong.

Core features:
- **Medications** — drug list, dosing schedules, adherence logs (taken/missed/skipped/snoozed).
- **Vitals** — blood pressure and glucose tracking.
- **Lab results** — scan a lab sheet (OCR), parsed into a test/value table, plus AI chat about results.
- **Nutrition** — AI nutrition coach (conversational goal setting, diet/exercise advice), meal logging.
- **Body composition** — InBody results via OCR or manual entry.
- **Daily check-ins** and **SOS alerts** that notify everyone watching the person's data.

(Internal/legacy name: "CareLink" — Supabase project id `carelink`, some UI strings still say it.)

## Repo layout
- **`mobile/` — Expo / React Native. THE app — iOS, Android, AND web all build from here.**
  Always work here.
- `supabase/` — Postgres backend (`migrations/`) + Deno edge functions (`functions/`).
- `legacy/frontend/` — **retired** React 19 + Vite + Capacitor 8 app, the original
  product the Expo app replaced (`mobile/` Phase 0 = "Expo migration"). Kept for
  reference only. **Do not edit, build, or deploy it** — if you find logic worth
  reusing, port it into `mobile/`.

## Mobile tech stack (`mobile/`)
- **Expo SDK 54**, React Native 0.81.5, React 19.1, New Architecture enabled.
  ⚠️ Expo changes fast — read the **versioned** docs `https://docs.expo.dev/versions/v54.0.0/`
  before writing any Expo code (see `mobile/AGENTS.md`).
- **Routing**: expo-router v6, file-based + typed routes. Screens in `mobile/app/`:
  `(tabs)/` = index, vitals, ai, medications, profile; plus login/signup/onboarding
  and `giver/[takerId]`.
- **Data/state**: `@tanstack/react-query` v5 for server state; `zustand`
  (`stores/authStore.ts`) for auth/session.
- **Backend client**: `@supabase/supabase-js` — wrapped behind `lib/api.ts`
  (data-access layer — go through it) and `lib/supabase.ts`.
- **Styling**: NativeWind v4 over Tailwind 3 (`global.css`, `tailwind.config.js`).
- **i18n**: `i18next` / `react-i18next`, `i18n/{en,ko}.json` — **Korean is the primary
  market**; add both locales for any user-facing string.
- **Auth**: phone number + password, Korean format `010-XXXX-XXXX` (`lib/phoneUtils.ts`).
- **Native**: expo-notifications, expo-secure-store, expo-image-picker/-manipulator,
  expo-haptics. `patch-package` runs on postinstall — keep `patches/` intact.
- **OCR flow**: image → `lib/ocr.ts` / `lib/camera.ts` → Gemini via the
  `process-ocr-gemini` edge function (meals, prescriptions, lab sheets).

## Backend (`supabase/`)
- **Postgres** — schema and RLS policies live in `migrations/` (RLS-enforced; never
  bypass it). Key tables: `users`, `profiles`, `care_circles`, `care_circle_members`,
  `loved_ones`, `medications`, `medication_schedules`, `medication_logs`,
  `vitals_blood_pressure`, `vitals_glucose`, `lab_results`, `daily_checkins`.
- Enums: roles `loved_one|caregiver|primary|viewer`, tier `free|premium`,
  log status, lab status, measurement timing, activity intensity.
- **Edge functions** (Deno): `analyze-meal`, `ask-ai`, `check-medication-reminders`,
  `drug-info`, `nudge-notification`, `nutrition-chat`, `process-ocr-gemini`, `sos-alert`.

## Working conventions
- **Commits**: `feat:` / `fix(mobile):` / `refactor:` — scoped Conventional Commits.
- **Dev/lint**: `npx expo start`; `npm run lint` (`expo lint`) — run from `mobile/`.
- **Web build**: `npx expo export --platform web` → `mobile/dist/`. Vercel deploys
  this (root `vercel.json`). Web runs as a client-side SPA — `app.json` sets
  `web.output: "single"` (not `"static"`: static prerendering crashes on Node
  because browser-only deps like `async-storage`/Supabase auth touch `window`).
  Vercel needs `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` set.
- Every user-facing string goes in **both** `en.json` and `ko.json`.
- **No silent fallbacks** — on failure show an explicit error state with retry/guidance,
  never placeholder data (see parent `/Users/j/CLAUDE.md`).

## Pointers
- `mobile/AGENTS.md` — Expo versioning warning.
- `mobile/lib/api.ts` — the data-access layer; reuse its helpers (e.g. `cleanDrugName`).
- `/Users/j/CLAUDE.md` — the devlyn engineering contract (root-cause, subtractive-first,
  goal-locked). It governs every change; this file does not repeat it.

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.