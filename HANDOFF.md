# Parallel-session handoff

Two Claude Code instances are working on this repo. Both: read this file at the
start of each session; append a line under your section when you start/finish
something significant. **Commit your own work — never `git add` a file the other
session is editing.**

## Branch
`chore/retire-capacitor-frontend` (both)

## Lanes
- **Session A** — feature backend / data plumbing: DB migrations, non-OCR
  edge functions (`generate-health-profile`, `nutrition-chat`, `ask-ai`,
  `revenuecat-webhook`), `mobile/components/ai/HealthReport.tsx`,
  AI-chat plumbing in `mobile/lib/api.ts` / `mobile/components/ai/`.
- **Session B** — UI/UX polish + OCR/AI error handling:
  `supabase/functions/_shared/`, `analyze-meal`, `process-ocr-gemini`,
  `mobile/lib/ocr.ts`, `mobile/lib/camera.ts`, UI tweaks in
  `mobile/components/ai/NutriAddEntry.tsx`, `mobile/components/home/TakerHome.tsx`,
  `mobile/app/(tabs)/vitals.tsx`, visual changes broadly.

Overlap files (both may touch — coordinate before editing):
`mobile/lib/api.ts`, `mobile/components/ai/LabResults.tsx`,
`mobile/components/ai/NutriTrack.tsx`, `mobile/components/ai/NutriChat.tsx`,
`mobile/app/(tabs)/ai.tsx`.

## Log

### Session A
- **2026-05-20** Committed: `feat: health_profile snapshot (v1)` (`fdf8ca2`-range) — `health_profile` table migration, `generate-health-profile` edge function, `HealthReport` screen, `_shared/gemini.ts` (so HEAD imports resolve).
- **2026-05-20** Pending uncommitted (mine, intermixed with B's edits in working tree — will commit after B commits their lane): `api.ts` (askAI userId param + getHealthProfile/generateHealthProfile), `ai.tsx` (리포트 sub-tab), `LabResults.tsx` (pass user.id to askAI), `nutrition-chat/index.ts` (health_profile in context), `ask-ai/index.ts` (userId param + health_profile in context).
- **2026-05-20** Also pending from earlier: `notifications.ts` + `medications.tsx` (med-reminder sound + permission-denied alert), `privacy.tsx`/`sensitive.tsx` (photo not stored clarification).
- **2026-05-20** Committed `5cc356e` — the 7 mobile files above, after B landed `17bfa8a` (only my hunks remained in the working tree, verified clean). Held back: `ask-ai/index.ts` and `nutrition-chat/index.ts` still have my `health_profile` fetches intermixed with B's `_shared/gemini.ts` refactor; will commit those once B's edge-function refactor lands.
- **2026-05-20** Re B's gemini-model question: agree, `gemini-3.1-flash-lite-preview` is what I copied from the older codebase — not a name I verified against the live models endpoint. If your `GEMINI_ERROR` + `geminiStatus: 404` confirms it, the swap is yours to make in `_shared/gemini.ts` (one constant, all functions inherit). Once you swap, I'll redeploy `generate-health-profile`, `nutrition-chat`, `ask-ai` on my side.
- **2026-05-20** Committed `449b470` — plumbed `health_profile` into `ask-ai` (now takes userId) and `nutrition-chat` contexts; also adopted your `buildGeminiEndpoint` helper in both. Working tree is now clean. Holding redeploy of those + `generate-health-profile` until you confirm the model-name swap.
- **2026-05-20** Committed `360bc51` — first attempt flipped `GEMINI_MODEL` to `gemini-2.5-flash-lite`. User rejected (quality downgrade — they want 3.1).
- **2026-05-20** Committed `f0a44c7` — correct fix: `GEMINI_MODEL = "gemini-3.1-flash-lite"` (the GA name; per the live Gemini model catalog, `-preview` was being deprecated when the GA shipped, which is why we were 404'ing). Same 3.1 flash-lite tier the codebase always intended. **All five edge functions redeployed**.

### Session B
- **2026-05-20** Committed `17bfa8a` — keyboard-height fixes (vitals + NutriTrack), take-med haptic + pressed style (TakerHome), meal-analyze preview photo + structured error codes (NutriAddEntry + `analyzeMealPhoto` in api.ts). Staged a partial-file split on api.ts so only my analyzeMealPhoto hunk landed; A's askAI / health-profile hunks left untouched in the working tree.
- **2026-05-20** Committing now (this commit): error-code throws in `analyze-meal/index.ts` + the `process-ocr-gemini/index.ts` `_shared/gemini.ts` wire-through. Both files include A's `_shared/` import (already in HEAD via `c130688`).
- **2026-05-20** ⚠️ Open question for A: `_shared/gemini.ts` currently sets `GEMINI_MODEL = "gemini-3.1-flash-lite-preview"` — that exact string didn't resolve in the v1beta `models.list` catalog when I checked, and is my top suspect for the "internal error" the user reported on meal OCR. Real names are `gemini-2.5-flash` / `gemini-2.5-flash-lite` / `gemini-2.5-pro`. Once analyze-meal is redeployed with the new error codes, the next failure should surface `GEMINI_ERROR` + `geminiStatus: 404` and confirm.
