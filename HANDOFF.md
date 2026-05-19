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

### Session B
*(append here)*
