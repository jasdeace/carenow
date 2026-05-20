# Handoff: CareLink Redesign

## Overview
A complete visual refresh of the **CareLink (carelink, 약 / 건강수치 / AI / 프로필)** Korean medication & health tracking app. The redesign shifts the brand from a generic bright green to a **warm, medical teal** system (One Medical / Hims direction) — soft, approachable, modern — and replaces ad-hoc styles with a coherent design system: type, color, spacing, components, and a logo + favicon package.

This handoff covers:
- Brand mark + favicon
- Three home-screen layout variants (A/B/C)
- Health metrics screen
- Medicine add/edit screen
- AI chat screen
- Profile screen

## About the Design Files
The files in this bundle are **design references created in HTML/React**. They are prototypes showing the intended look, hierarchy, spacing, and interactions — they are **not** production code to copy verbatim.

Your job is to **recreate these designs in the CareLink codebase's existing environment** (the screenshots suggest a native iOS or React Native app — keep the same framework, navigation system, state management, and component primitives the app already uses). Use the **design tokens** in this README as your source of truth and translate them into whatever styling system the codebase uses (SwiftUI modifiers / StyleSheet / Tailwind / NativeWind / styled-components / etc.).

If you're working in SwiftUI: lift the colors into an Asset Catalog + `Color` extensions, the type scale into a `Font` extension, and recreate each screen as a SwiftUI view. If you're working in React Native: tokens go in a `theme.ts`, components in `components/`, screens in `screens/`.

## Fidelity
**High-fidelity (hi-fi).** Final colors, typography, spacing, component shapes, and copy. Recreate pixel-faithfully — same paddings, same radii, same hex values.

---

## Brand

### Logo
A rounded-square (squircle, 28% radius) teal tile containing a horizontal capsule pill rotated -32°. The pill is split into cream (left) and coral (right), bisected by a thin dark notch. A subtle heartbeat line crosses the pill for the primary mark; the "simple" variant omits the heartbeat for use ≤32px.

- **Primary background**: `#0F766E` (teal-700)
- **Pill cream half**: `#FAF7F1`
- **Pill coral half**: `#E8927C`
- **Notch**: `rgba(15,44,46,0.10)`
- **Heartbeat stroke**: `rgba(15,44,46,0.85)`, stroke width 1.6, round caps

### Wordmark
- **"carelink"** — all lowercase, font-weight 700, letter-spacing `-0.025em`, color `--ink-900`
- Optional uppercase Korean subtitle ("내 건강 동반자") in `--ink-500`, letter-spacing `0.06em`

### Favicon
SVG-based, no heartbeat (simpler version reads clearly at 16px). Provided as `favicon.svg`.

---

## Design Tokens

### Color
| Token | Hex | Usage |
|---|---|---|
| `teal-900` | `#0B3F3D` | Deepest brand |
| `teal-800` | `#0E5C5A` | Hero card background, pressed state |
| `teal-700` | `#0F766E` | **Primary** — buttons, active tab, logo |
| `teal-600` | `#14857C` | — |
| `teal-500` | `#20A39A` | — |
| `teal-400` | `#4EC4BD` | — |
| `teal-300` | `#8FDDD7` | Hero accents on dark teal |
| `teal-200` | `#BFEDE9` | Ghost button border |
| `teal-100` | `#DDF4F1` | Tint pill bg, taken-state tint |
| `teal-50`  | `#EDFAF8` | "Taken" row background |
| `ink-900` | `#0F2C2E` | Primary text |
| `ink-700` | `#2E4547` | Secondary text |
| `ink-500` | `#5C6F71` | Muted text, captions |
| `ink-400` | `#87979A` | Inactive tab, placeholder |
| `ink-300` | `#B3BFC1` | Disabled, chevrons, hairlines |
| `cream-50`  | `#FAF7F1` | **Page background** |
| `cream-100` | `#F3EEE3` | Surface alt, segmented inactive |
| `cream-200` | `#E8E0CD` | — |
| `line`      | `#EBE5D6` | Borders |
| `line-soft` | `#F1ECDF` | Card borders |
| `paper`     | `#FFFFFF` | **Card surface** |
| `coral-500` | `#E8927C` | Warm accent (next-dose marker, AI tokens pill) |
| `coral-300` | `#F3BFAE` | — |
| `coral-100` | `#FBE5DC` | Coral tint pill bg |
| `sand-500`  | `#D6A85F` | Caution |
| `sand-200`  | `#F4E3BD` | — |
| `sand-100`  | `#FBF1D9` | Warning pill bg |
| `rose-500`  | `#D85B66` | Systolic BP, heart icon |
| `rose-100`  | `#FBE3E5` | BP card icon bg |
| `sky-500`   | `#4B6FD1` | Diastolic BP, blood sugar icon |
| `sky-100`   | `#E2E8F8` | Blood sugar card icon bg |
| `ok-500`    | `#1F9A6E` | — |
| `ok-100`    | `#DDF1E7` | — |
| `warn-500`  | `#C99339` | — |
| `warn-100`  | `#F8EBCC` | — |
| `danger-500`| `#C84A4A` | Destructive |

### Typography
**One font family: Pretendard** (variable, Korean-optimized sans).

- Load: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`
- Fallback stack: `'Pretendard', 'Pretendard Variable', 'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif`

| Role | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|
| Display / H1 | 28–30 | 700 | -0.03em | 1.15 |
| H2 / Section title | 22 | 700 | -0.025em | 1.2 |
| H3 / Card title | 18 | 600 | -0.02em | 1.2 |
| Stat number | 22–38 | 600–700 | -0.02em | 1 |
| Body | 14 | 400–500 | 0 | 1.5 |
| Body small | 12.5 | 500 | 0 | 1.45 |
| Caption | 11–12 | 600 | 0.04–0.06em (uppercase) | 1.2 |
| Button | 14 | 600 | -0.01em | 1 |

Use **tabular-nums** (`fontVariantNumeric: 'tabular-nums'`) for all numeric readouts (time, dose, mg, bpm, dates, percentages).

### Radii
- `xs` 8 · `sm` 12 · `md` 16 · `lg` 20 · `xl` 28 · `pill` 999
- Cards: 18–22px · Buttons: 12–16px · Pills/chips: 999px · Icon tiles: 9–14px

### Shadow
- `shadow-card`: `0 1px 2px rgba(15,44,46,0.04), 0 6px 16px -8px rgba(15,44,46,0.12)`
- `shadow-pop`:  `0 8px 24px -6px rgba(15,44,46,0.18)`
- Hero card (teal-800): `none` — relies on darkness against cream

### Spacing
Common values: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24
- Screen edge padding: **20px** horizontal
- Card internal padding: **14–22px**
- Vertical rhythm between cards: **10–14px**
- Section header → first card: **24px**

---

## Screens

### Common chrome (all screens)
- **Status bar**: 44px tall, time top-left (tabular-nums, weight 600, 15px), iOS-style signal/wifi/battery glyphs top-right. 22px horizontal padding.
- **Tab bar** (bottom, sticky):
  - Height: ~78px including 22px bottom safe-area
  - Background: `rgba(250, 247, 241, 0.92)` with `backdrop-filter: blur(20px)`
  - Border-top: 1px `--line`
  - 5 tabs in a grid: **홈 / 건강수치 / 약 / AI / 프로필**
  - Center tab (약) is elevated: 38×38px rounded-12 tile, teal-700 when active, cream-100 when not
  - Icon stroke 1.6, 22×22; label 10.5px / 600 weight
  - Active color: `--teal-700`; inactive: `--ink-400`
- **Phone frame** (for prototyping only — do not ship): 380×800, 44px radius, 10px solid `--ink-900` border, dynamic island 105×30 at top center.

---

### Home — Variant A · Editorial *(recommended default)*
**Purpose**: At-a-glance daily check-in. Hero progress front and center.

**Structure** (top to bottom, 20px h-padding):
1. **Status bar** (10:31)
2. **Header**: logo+wordmark left (none here — header omitted), bell icon button + avatar circle right (32px)
3. **Date kicker**: "5월 20일 · 수요일" — 13px, --ink-500, weight 600, uppercase, letter-spacing 0.06em
4. **Greeting**: "좋은 아침이에요, **원석**님." — 30px sans, weight 400 base + teal-700 colored name. 2-line break before name. (in the actual code the name is in `<span>` with `color: --teal-700`)
5. **Hero card** — `--teal-800` background, white text, radius 24, padding 20/22, overflow hidden, with a 180px radial-gradient (teal-300 → transparent) blob top-right:
   - Top row: "오늘의 복용" kicker (uppercase, opacity 0.7) + "1 / 3" serif on right (now: sans, weight 600)
   - Ring (84×84, stroke 9) — value 0.33, color teal-300, track white@15%, with centered "33%" text (26px serif/sans 700)
   - To the right of ring: "다음 복용까지 **4시간 29분**" — 22px display, "4시간 29분" in teal-300
   - Bottom: 3 horizontal pip bars (one per dose), `--teal-300` if taken else `rgba(255,255,255,0.18)`, 6px tall, gap 8
6. **Section header**: "오늘의 약" + "모두 보기" link (right, teal-700, 13px, weight 600), 24px top margin / 12px bottom
7. **Med rows** (×3, gap 10): white card, radius 18, padding 14/16, 1px line-soft border
   - **Left**: 44×44 rounded-14 icon tile with category-tint (rose/coral/teal). Pill icon, 22×22
   - **Middle**: med name (17px, weight 600) + category tag (12px, --ink-400); under it time · dose
   - **Right**: if taken → 32×32 teal-700 circle with check; else → "복용" button (pill, teal-700, white, 14px padding, 13px weight 600)
   - Taken rows: opacity 0.78
8. **Section header**: "주간 복용률" + subtitle "지난 7일" + right pill "평균 56%"
9. **Week strip card**: white, radius 18, padding 16/14. 7-col grid:
   - Day label (목/금/토…) — 11px weight 600 --ink-500
   - Dot (30×30 circle): teal-700 if 100, teal-200 if ≥60, sand-100 if <60. Number inside (11px tabular). If null: dashed border circle.
   - Date below (e.g. "5.20") — 10px --ink-400

**Sample data**:
```js
const TODAY_MEDS = [
  { time: '09:00', name: '듀카브정', dose: '60/10mg', status: 'taken',   tone: '혈압', tint: 'rose'  },
  { time: '10:15', name: '오메가3',  dose: '1000mg', status: 'taken',   tone: '영양', tint: 'coral' },
  { time: '15:00', name: '크레아틴', dose: '5g',     status: 'pending', tone: '운동', tint: 'teal'  },
];
const WEEK = [
  { day: '목', date: '5.14', pct: null },
  { day: '금', date: '5.15', pct: 33 },
  { day: '토', date: '5.16', pct: 67 },
  { day: '일', date: '5.17', pct: 67 },
  { day: '월', date: '5.18', pct: 33 },
  { day: '화', date: '5.19', pct: 67 },
  { day: '수', date: '5.20', pct: 67 },
];
```

---

### Home — Variant B · Timeline
**Purpose**: When the user has many doses spread through the day, a vertical time-axis is clearer than a flat list.

**Structure**:
1. Status bar + header (same as A)
2. Date "2026년 5월 20일" + "안녕하세요, 원석님" greeting (26px)
3. **Stat row** (3 cards, grid 1.4/1/1, gap 8, marginBottom 22):
   - "오늘 복용" — `3 / 5`, sub "60% 진행" (teal tone)
   - "연속 기록" — `12` 일 (coral tone)
   - "이번주" — `56%` (sand tone)
   - Each card: tone-bg color, radius 16, padding 12/14, min-height 86. Kicker 11px uppercase weight 700, value 26px tabular weight 600, optional unit / sub
4. Section header: "오늘의 일정" + "시간순" subtitle + right pill "다음 15:00" (coral)
5. **Timeline**: absolute-positioned 2px vertical line at x=32px, gradient teal-200 → cream-100. For each dose:
   - Time label (44px wide, 13px weight 600 tabular)
   - 14×14 dot (teal-700 filled / coral-500 with 4px ring shadow if next / white-with-grey-border if pending) — sits on top of the vertical line (z 1)
   - Card (flex 1, radius 14, paper bg, padding 12/14): name + dose; right side shows "복용" check or "지금 복용" button or "예정" label
   - Taken rows: opacity 0.72 + strike-through on name
   - Next dose: card border coral-300

---

### Home — Variant C · Refined original
**Purpose**: Closest to the current shipped layout but lifted to the new system. Use this for migration if A/B feel too different.

**Structure**:
1. Status bar
2. **Logo header row**: mark (26px) + "carelink" wordmark left; bell icon right
3. **Segmented control** (under header): cream-100 bg padding 4 radius 14, 2-col grid. Active half: paper bg, radius 11, shadow, teal-700 text, weight 600. Inactive: weight 500 --ink-500
4. Greeting "좋은 아침이에요, **장원석**님" (26px), then a green status chip below: teal-100 bg, teal-800 fg, "✓ 컨디션 양호"
5. **Today's meds card** (white, radius 22, padding 18/18/16):
   - Header: "오늘의 약" (18px) + "1 / 3" pill (cream-100 bg, ink-700, tabular)
   - Med rows: radius 14, padding 12. Taken: teal-50 bg + teal-200 border. Pending: cream-100 bg. Layout: time pill (sand/mint) → name+dose → check chip OR teal "복용" button
6. **Weekly adherence card** (white, radius 22):
   - Header: "주간 복용률" + "자세히" link (teal-700, weight 600)
   - 7-col grid of **vertical bars** (not dots): each bar 56px tall, height proportional to %. teal-700 if ≥60, sand-200 if <60. Number rendered inside the bar at the top in white or warn-500.

---

### Health Metrics (건강수치)
**Purpose**: View and log vitals. Blood pressure gets the hero treatment; others collapse into stacked cards.

**Structure**:
1. Status bar
2. Header: "건강수치" (28px display, weight 700) + icon "+" button (36×36, paper bg, --line-soft border)
3. **BP card** (white, radius 22, padding 18):
   - Top-left: rose-100 icon tile (28×28 rounded-9) + "혈압" (17px) + "· 최근 측정 16:26" muted
   - Big readout: **120** in rose-500 (38px sans 700 tabular) **/** ink-300 separator **80** in sky-500 (38px sans 700 tabular) **mmHg** (12px --ink-500)
   - Sub: "맥박 72 bpm · **정상 범위**" (teal-700 weight 600)
   - Top-right: 3-pill range selector "7일 / 30일 / 90일" — active pill teal-700/white, inactive cream-100/ink-500
   - **Mini chart** (SVG, 320×100 viewBox, width: 100%):
     - Two lines: rose-500 systolic (sys: [120, 105, 118, 120, 120]) on top half, sky-500 diastolic (dia: [80, 65, 69, 80, 80]) on bottom half
     - Dashed horizontal divider at y=50 (--line, dasharray 3 3)
     - Each point: circle r=3 white fill stroked with line color
     - Each point value labeled above (systolic) / below (diastolic) — 9.5px sans 600
   - Full-width primary button under chart: "+ 새 측정값 기록" — teal-700, radius 14, padding 12, white text, weight 600
4. **Collapsed metric cards** (radius 18, paper, padding 14/16, marginBottom 10):
   - 32×32 rounded-10 icon tile (drop / weight / pulse) with category color
   - Name (16px weight 600) + tag pill (e.g. "공복", "안정시")
   - Time (11.5px --ink-500)
   - Right: big value (22px sans 600 tabular) + unit (11px --ink-500); optional delta (e.g. "-0.4kg" in teal-700)
   - Chevron at end; rotates 90° when expanded
   - **Weight card is expanded** by default — shows weight sparkline (320×70 viewBox, teal-700 line over teal-700@18% gradient fill, data: [86.6, 86.5, 86.3, 86.4, 86.1, 86.2])

**Metrics shown**: 혈당 (Blood sugar) · 체중 (Weight) · 심박수 (Heart rate)

---

### Medicine Add/Edit (약 수정)
**Purpose**: Add a new med or edit an existing one. AI prescription scan is the hero affordance.

**Structure**:
1. Status bar
2. Header bar: "약 수정" (22px display) + close X button (right). 1px --line-soft bottom border.
3. **Prescription scan callout** (radius 18, padding 20, teal-50 bg, 1.5px dashed teal-300 border):
   - Centered teal-700 44×44 rounded-14 tile with camera icon
   - "처방전 스캔" title (15px weight 600 teal-800)
   - Subtitle: "AI가 약 정보를 자동으로 채워드려요" (12px --ink-500)
4. **Form fields** (gap 14):
   - Each field: small uppercase-ish label (12.5px weight 600 --ink-500), input below
   - **약 이름** — text input, default "오메가3"
   - **복용량 / 단위** — 2-col grid (2fr 1fr): number input "1000" + unit input "mg"
   - **복용 시간 (하루 1회)** — trailing "+ 추가" link (teal-700, 12.5px weight 600). Chips below in a flex-wrap row:
     - TimeChip: teal-100 bg, teal-800 fg, padding 8/12, radius 999, weight 600, contains text + faded × icon
     - Sample chips: "아침 08:00" · "저녁 19:00"
   - **복용 기간** — segmented chips:
     - Active: --ink-900 bg, white fg
     - Inactive: cream-100 bg, --ink-500 fg
     - Options: "매일" (active) · "요일별" · "특정 날짜"
   - **메모 (선택)** — textarea, 60px min-height, default "식후 30분 이내 복용"
   - Input baseline: cream-100 bg, transparent border, radius 12, padding 11/14, 14px
5. Full-width "저장" button at bottom (teal-700, radius 14, padding 14, 15px weight 600 white)

---

### AI 건강 도우미 (AI)
**Purpose**: Conversational AI for test results & meal management.

**Structure**:
1. Status bar
2. **Header row**: sparkle icon tile (32×32, teal-100/teal-700) + "AI 건강 도우미" title (22px display) + **token pill** on right
   - Token pill: coral-100 bg, #A85A45 fg, sparkle icon + "87 토큰", radius 999, weight 600
3. **Segmented tabs** (under header): "식단 관리" / "검사결과" (active). Same segmented control as Home C.
4. **Suggestion chips row** (horizontal scroll):
   - Caption "추천 질문" (12px weight 600 --ink-500 letter-spacing 0.04em)
   - 4 chips: "이 검사 어떤가요?" / "복용 중인 약과 연관?" / "주의할 음식" / "재검 시기"
   - Each: paper bg, 1px --line border, radius 999, padding 8/14, 12.5px weight 500 --ink-700
5. **Message list** (scrollable):
   - **AI bubble**: paper bg, radius 18 (top-left 6), 1px line-soft border, padding 11/14, max-width 80%, font 13.5/1.5
     - First bubble shows a serif italic timestamp inline (now use sans muted style: italic removed, plain --ink-500 12px)
     - Welcome: "무엇이든 물어보세요. 이번 검사 결과를 함께 살펴볼 수 있어요."
   - **User bubble**: teal-700 bg, white fg, radius 18 (top-right 6), aligned right, max-width 80%
     - Example: "어떤가요?"
   - **AI response**: contains inline-bold coral analysis "**LDL 콜레스테롤 142mg/dL**" + nested suggestion card:
     - cream-50 bg, 1px --line-soft, radius 12, padding 10/12, 12.5px / 1.5
     - "제안" header (weight 600, --ink-900) + bullet list ("• 포화지방 줄이기" etc., --ink-700)
6. **Composer** at bottom (above tab bar):
   - 10/16px padding, 1px --line-soft top border, cream-50 bg
   - Rounded-999 paper input row (1px --line, padding 6/6/6/16) with placeholder "질문을 입력하세요" + 38×38 round teal-700 send button (paper-airplane icon)

---

### Profile (프로필)
**Purpose**: User info + care-group sharing + settings.

**Structure**:
1. Status bar
2. Header: "프로필" (26px display) + cog icon button right
3. **Profile card** (paper, radius 22, padding 22/20, centered):
   - **Avatar**: 76×76 circle, teal-700 bg with white "장" inside. A 24×24 coral-500 "+" badge bottom-right (3px paper border).
   - Name "장원석" (22px display weight 700)
   - Sub: "1985년생 · 남성 · 178cm" (12.5px --ink-500)
   - **Stats row** (top-bordered, 16px padding-top): 3 stats separated by 1px --line dividers
     - "12 · 연속 일수"
     - "3 · 복용 약"
     - "89% · 평균 복용률"
   - Each: value 22px sans 600 tabular + optional unit (12px --ink-500) + label below (11px --ink-500)
4. **Care group card** (radius 18, padding 16/18, linear-gradient teal-800 → teal-700, white text, decorative blob top-right):
   - Kicker "케어 그룹" (11px uppercase weight 700, opacity 0.7)
   - "가족 공유" (18px display) + "2명이 보고 있어요" (12px @0.75)
   - Avatar stack on right: "아" (coral-300 bg) and "딸" (sand-200 bg) — each 32px circle
5. **Settings groups** — each group has a small uppercase kicker title and a single rounded card holding rows:
   - Group title: 11.5px weight 700 --ink-500 letter-spacing 0.06em uppercase, 6px bottom margin, 4px left padding
   - Group card: paper, radius 16, 1px --line-soft, overflow hidden
   - Row: 28×28 rounded-9 cream-100 icon tile + 14px label (weight 500) + optional value (12.5px --ink-500) + chevron (--ink-300). Padding 13/14. Border-bottom --line-soft between rows.
   - **건강 정보**: 복용 중인 약 (3개) · 기저 질환 (고혈압) · 병원·약국 공유
   - **알림**: 복용 알림 (켜짐) · 측정 알림 (매주 월요일)

---

## Interactions & Behavior
The mocks are static, but expect the dev to wire up:

- **Tap "복용" button** on a pending med row → flip to taken state. Use a 200ms ease-out spring (transform: scale 0.96 → 1.0; fade button → fade check).
- **Tap a med row** → opens edit screen (약 수정).
- **Tap "되돌리기"** (in the original — preserved here as a yellow chip on accidentally-taken rows) → revert to pending.
- **Segmented control** (Home C, AI tabs): tap to switch; underline indicator slides 220ms ease.
- **7일 / 30일 / 90일 range pills** (Metrics BP card): tap to switch chart range; smoothly tween line paths (300ms ease-in-out).
- **AI suggestion chips** → prefill input.
- **Send button** in AI composer → only enabled when input non-empty. Show typing indicator (3-dot bouncing dots in an AI bubble) while waiting for response.
- **Bottom tab nav** → standard stack navigation. Active tab gets `--teal-700`; haptic light impact on tap (iOS).
- **Status pills** (mint / sand / coral / sky / cream): driven by status enum, never hard-coded per row.
- **Long-press a med row** → context menu: 수정 / 삭제 / 알림 끄기.
- **Pull-to-refresh** on Home: re-sync today's adherence.

### Animation guidance
- Use spring physics for state changes (RN: `Animated.spring` with `tension: 200, friction: 22`; SwiftUI: `.spring(response: 0.35, dampingFraction: 0.8)`).
- Card press: scale to 0.985 with 80ms duration.
- Sheet/modal: present with 350ms ease-out, dismiss 250ms ease-in.
- Ring/bar progress: animate stroke-dashoffset over 600ms ease-out on mount.

---

## State Management
This UI doesn't dictate a particular state library — use whatever the codebase already has (Redux, Zustand, MobX, SwiftUI `@State`/`@Observable`, etc.). What it needs:

- **Today's meds list** — `{ id, time, name, dose, category, status: 'pending'|'taken'|'skipped', takenAt? }`
- **Week adherence** — array of 7 days with date + percent + null-for-future
- **Vitals history** — per-metric (`bp`, `bloodSugar`, `weight`, `heartRate`): array of timestamped readings
- **AI chat thread** — array of messages, plus token balance
- **Profile** — user demographics, care-group members, settings flags

Local-first if possible; sync to backend in the background.

---

## Assets
- `favicon.svg` — bundled, all-vector. Use as web favicon and as the source for native app icon (export to 1024px PNG, then derive iOS/Android icon sets via Xcode / Android Studio asset generator).
- No raster images required for these screens.
- All icons are inline SVG paths defined in `ui.jsx` → `Ico.*`. If your codebase uses an icon library (SF Symbols / Lucide / Heroicons), map them across — included list:
  - `home` (house), `pulse` (heartbeat line), `pill` (capsule with center divider), `spark` (sparkles), `user` (avatar)
  - `bell`, `check`, `undo`, `heart`, `drop`, `weight` (kettlebell-ish), `plus`, `chev` (right chevron), `close` (X), `cam`, `send` (paper plane), `trash`, `dots`, `cog`, `share`

Closest SF Symbols mapping (for iOS):
- home → `house.fill` · pulse → `waveform.path.ecg` · pill → `pills.fill` · spark → `sparkles` · user → `person.crop.circle.fill`
- bell → `bell` · check → `checkmark` · heart → `heart.fill` · drop → `drop.fill` · weight → `figure.strengthtraining.traditional` (or custom) · cam → `camera.fill` · send → `paperplane.fill` · cog → `gearshape.fill`

---

## Files in this bundle
- `CareLink Design.html` — entry point, loads everything
- `styles.css` — design tokens + base styles
- `logo.jsx` — `CLMark`, `CLMarkSimple`, `CLLockup`, `CLHeaderLogo`
- `ui.jsx` — `Ico`, `StatusBar`, `TabBar`, `AppHeader`, `TimePill`, `Ring`, `Avatar`
- `screens-home.jsx` — `HomeA`, `HomeB`, `HomeC` + sub-components
- `screens-other.jsx` — `MetricsScreen`, `MedicineEditScreen`, `AIScreen`, `ProfileScreen` + sub-components
- `brand.jsx` — Brand specimen artboards (Logo / Favicon / Color / Type)
- `app.jsx` — DesignCanvas composition
- `design-canvas.jsx` — Canvas host (drag/zoom/focus — for review only, do NOT port)
- `favicon.svg` — production favicon

Open `CareLink Design.html` in a browser to see all artboards. Click any artboard label to focus it fullscreen; ← / → / Esc to navigate.

---

## Implementation order (suggested)
1. **Tokens** — port colors, type scale, radii, spacing into your theme file/asset catalog.
2. **Primitives** — `Pill`, `IconTile`, `Card`, `StatusPill`, `Avatar`, `Ring`, `TimeChip`.
3. **Logo + Favicon** — replace the existing app icon and any in-app logo usages.
4. **TabBar** — replace the current bottom navigation, including the elevated "약" center button.
5. **Home (Variant A)** — ship as the default; keep B and C in a feature flag if you want to A/B.
6. **Health Metrics** — BP first, then collapse the rest.
7. **Medicine Add/Edit** — wire the prescription-scan camera intent.
8. **AI screen** — chat composer + token pill.
9. **Profile** — settings groups + care-group card.

Ship behind a feature flag in case the visual shift surprises users; offer an in-app "기존 디자인으로 돌아가기" option for the first 2 weeks if possible.
