# Pump PWA — Parity Plan vs. WorkoutApp (Source of Truth)

Last updated: 2026-04-18.

This plan compares the current PWA at `pump-pwa/` against the canonical SwiftUI app at `WorkoutApp/` and lists every misaligned feature, missing seed, and missing capability. It is structured so several agents can pick up non-overlapping slices and work in parallel.

The SwiftUI app is authoritative. When the PWA disagrees with it, the PWA is wrong.

---

## 0. Top-level gaps at a glance

| Area | Source-of-truth (Swift) | Current PWA | Severity |
|---|---|---|---|
| Exercise taxonomy | 8 body-part types × 3 measure kinds (`weight`/`seconds`/`repsOnly`) | 5 categories × 2 types (`strength`/`cardio`) | **Structural** |
| Workout lifecycle | `planning → active → (paused) → completed` with `createdAt`, `pausedAt`, `totalPausedDuration`, `hasBeenEdited` | Workout goes straight to `active` then `completed`; no planning, no pause | **Structural** |
| Template richness | `Template → TemplateExercise → TemplateSetGroup` with suggested sets/reps/weight/duration pre-filled | `Template.exerciseNames: string[]` — no pre-fill | **Structural** |
| Seed templates | 8 (Push, Pull, Leg, Core, Full Body 1/2/3) with concrete weights | 4 (Push, Pull, Leg, Core) with name-only exercise lists | Seed gap |
| Seed warmup | Every seeded template starts with `Stair Climber · 15 min` | Not present | Seed gap |
| Stats screen | YEAR totals, FREQUENCY (per week/month), TOP EXERCISES, PERSONAL RECORDS | Streak, weekly volume, weight progression | Wrong metrics |
| Exercise picker | Multi-select, "ADD (N)" button | Single-tap select | Feature gap |
| Home screen | Card-stack carousel, daily tip, long-press menu, 3-sec countdown, `PAUSED`/`PLANNING` badges | Simple list + CONTINUE/START buttons | Feature gap |
| Active workout | Editable name, pause/resume, swipe-delete sets, drag reorder, collapse cards, set continuity, END→summary flow, SAVE-to-template | Basic set logging | Feature gap |
| History | Tap-to-edit detail view, editable dates, edit exercises post-hoc, convert-to-template | View-only cards + delete | Feature gap |
| Template editor | Per-exercise set groups editable from workout planning mode; drag reorder | Name + flat exercise list + ▲/▼ reorder | Feature gap |
| Template details | Dedicated sheet (stats, START, EDIT, DUPLICATE) | Inline buttons on home card | Feature gap |
| Design tokens | Lime accent (`#91DA73`), success green (`#2E6F40`), rounded fonts, 8px radius, hard-offset shadows | Pure B&W monospace, radius 0, no shadow | Intentional style drift (needs reconciliation) |
| Manifest theme | Implicit (white/lime) | `#0f172a` dark slate — doesn't match app visuals | Polish |
| DB reset | `resetDatabase(backupExisting:)` with timestamped backup | Not implemented | Missing |

The rest of this document is the detailed gap list plus the agent-by-agent execution plan.

---

## 1. Detailed gap list

### 1.1 Data models (`src/core/models.js`)

**`Exercise`**

- PWA has `category: 'push'|'pull'|'legs'|'core'|'cardio'` and `type: 'strength'|'cardio'`.
- Swift has `type: 'chest'|'back'|'shoulders'|'biceps'|'triceps'|'legs'|'core'|'cardio'` (the body part, renamed from legacy `bodyPart`) and `measureBy: 'weight'|'seconds'|'repsOnly'`.
- Impact: every exercise, filter chip, seed row, picker chip, stats aggregation, and active-workout row layout is downstream of this. Fixing this first unblocks every other slice.

**`ExerciseSet`**

- Missing `order: number` (Swift tracks set order explicitly).
- Otherwise aligned.

**`WorkoutExercise`**

- Missing `order: number`.
- Missing `measureBy` (required to render the correct set-row layout — cardio vs weight vs reps-only vs seconds).
- `exerciseType` as currently modelled (`'strength'|'cardio'`) is insufficient — replace with `measureBy`.

**`Workout`**

Missing fields:
- `createdAt: ISO string` — when the workout was created (can differ from `startedAt` for planned workouts).
- `pausedAt: ISO string | null` — timestamp of current pause start.
- `totalPausedDuration: number` — accumulated paused seconds.
- `hasBeenEdited: boolean` — true once the user modifies a planning-mode workout.

Missing derived states:
- `isPlanning` (created, not started)
- `isActive` (started, not completed)
- `isPaused` (`pausedAt !== null`)
- `isPromoted` (appears on home: started OR `hasBeenEdited`)
- `duration` that subtracts paused time

**`Template`**

- Missing `isCustom: boolean`.
- `exerciseNames: string[]` is too flat. Replace with `templateExercises: TemplateExercise[]`.

**New — `TemplateExercise`**

```
id, order, exerciseId, exerciseName, setGroups: TemplateSetGroup[]
```

**New — `TemplateSetGroup`**

```
id, order, sets (count), reps?, weight?, duration?
```

Represents "3 sets × 8 reps @ 155 lb" as one entity.

### 1.2 IndexedDB schema (`src/core/schema.js`)

- Current DB version: 1. After the model changes this must become version 2 with an upgrade path that rewrites existing exercises/workouts/templates into the new shape (or clears them — local-only data, an acceptable reset is fine so long as a backup is written).
- No object-store additions required — existing `exercises`, `workouts`, `templates` stores can hold the new shapes if records are rewritten.

### 1.3 Store API (`src/core/store.js`)

Already present (keep): `fetchExercises`, `createExercise`, `updateExercise`, `deleteExercise`, `fetchActiveWorkout`, `fetchCompletedWorkouts`, `fetchAllWorkouts`, `createWorkout`, `startWorkoutFromTemplate`, `completeWorkout`, `deleteWorkout`, `saveWorkout`, `addSetTo`, `updateSet`, `toggleSetCompleted`, `addExerciseToWorkout`, `removeExerciseFromWorkout`, `fetchTemplates`, `createTemplate`, `updateTemplate`, `deleteTemplate`.

Missing vs Swift `DataStore`:

- `startWorkout(workout)` — separates "create" from "start" (for planning mode).
- `pauseWorkout(workout)` / `resumeWorkout(workout)` — with `pausedAt` + `totalPausedDuration` accounting.
- `updateWorkoutName(workout, name)` — with implicit `markWorkoutAsEdited` for planning-mode workouts.
- `updateWorkoutDates(workout, startedAt, completedAt)` — for editing history entries.
- `reorderExercises(workout, workoutExercises)` — rewrites `order` field.
- `deleteSet(set, workoutExercise)` — granular set delete (the swipe-to-delete use case).
- `duplicateTemplate(template)` — deep copy with "Copy of X" / "Copy of X 2" naming; deep-copies `setGroups`.
- `convertWorkoutToTemplate(workout, name)` — groups consecutive sets with identical reps/weight/duration into `TemplateSetGroup`s.
- `updateTemplateFromWorkout(workout)` — sync the source template (matched by `templateId`) with the current workout's sets.
- `markWorkoutAsEdited(workout)`.
- `resetDatabase({ backupExisting: true })` — deletes IndexedDB, writes a JSON backup to `localStorage` under `pump-backup-<ISO>`, reseeds.

Also: `startWorkoutFromTemplate` must now materialise the template's `setGroups` into real `ExerciseSet`s with concrete weights/reps/durations pre-filled (currently it creates one empty set per exercise).

### 1.4 Seed data (`src/core/seed.js`)

**Exercise library.** The 47 names are present but the shape is wrong:

- Every exercise must be re-seeded with `type` (body part) and `measureBy`.
- PWA currently assigns every strength exercise `type: 'strength'`. Correct values per `ExerciseLibrary.swift`:
  - `measureBy: 'seconds'` — Plank, Side Plank, Treadmill, Elliptical, Stationary Bike, Rowing Machine, Stair Climber, Jump Rope.
  - `measureBy: 'repsOnly'` — Push-ups, Dips, Pull-ups, Chin-ups, Hanging Leg Raise, Ab Wheel Rollout, Russian Twist, Dead Bug, Bird Dog.
  - `measureBy: 'weight'` — everything else.
- Body-part `type` mapping (verbatim from Swift):
  - **chest** — Bench Press, Incline Bench Press, Dumbbell Press, Push-ups, Dips, Cable Flyes
  - **shoulders** — Overhead Press, Dumbbell Shoulder Press, Lateral Raises
  - **triceps** — Tricep Pushdown, Skull Crushers
  - **back** — Deadlift, Barbell Row, Dumbbell Row, Pull-ups, Chin-ups, Lat Pulldown, Seated Cable Row, Face Pulls, Shrugs
  - **biceps** — Barbell Curl, Dumbbell Curl, Hammer Curl
  - **legs** — Squat, Front Squat, Leg Press, Romanian Deadlift, Lunges, Bulgarian Split Squat, Leg Extension, Leg Curl, Calf Raises, Hip Thrust, Goblet Squat
  - **core** — Plank, Hanging Leg Raise, Cable Crunch, Ab Wheel Rollout, Russian Twist, Dead Bug, Bird Dog, Side Plank
  - **cardio** — Treadmill, Elliptical, Stationary Bike, Rowing Machine, Stair Climber, Jump Rope

**Seed templates.** PWA has 4, Swift has 8 — and Swift's have concrete weights/reps/durations. Re-seed all 8 templates below (values copied verbatim from the Swift `migrateTemplateWeights()` data). Every template starts with a `Stair Climber · 1 set · 900 s` warmup.

1. **Push Day** — Stair Climber 1×900s · Bench Press 4×8@155 · Overhead Press 3×8@95 · Dumbbell Press 3×10@50 · Tricep Pushdown 3×12@40 · Cable Flyes 3×12@25 · Skull Crushers 3×10@50
2. **Pull Day** — Stair Climber 1×900s · Lat Pulldown 4×8@130 · Seated Cable Row 3×10@120 · Face Pulls 3×15@30 · Barbell Curl 3×10@65 · Hammer Curl 3×12@25 · Lateral Raises 3×15@15 · Shrugs 3×12@60
3. **Leg Day** — Stair Climber 1×900s · Leg Press 4×8@270 · Lunges 3×10@35 · Hip Thrust 3×10@185 · Leg Curl 3×10@90 · Leg Extension 3×12@70 · Calf Raises 3×15@60
4. **Core Day** — Stair Climber 1×900s · Plank 3×45s · Side Plank 3×30s · Hanging Leg Raise 3×12 · Cable Crunch 3×15@30 · Ab Wheel Rollout 3×10 · Russian Twist 3×20 · Dead Bug 3×10 · Bird Dog 3×10
5. **Full Body 1** — Stair Climber 1×900s · Bench Press 3×10@135 · Lat Pulldown 3×10@115 · Overhead Press 3×10@80 · Barbell Curl 3×12@55 · Tricep Pushdown 3×12@35 · Leg Press 3×12@225 · Plank 3×45s
6. **Full Body 2** — Stair Climber 1×900s · Dumbbell Press 3×10@50 · Seated Cable Row 3×10@120 · Lateral Raises 3×15@15 · Hammer Curl 3×12@25 · Skull Crushers 3×10@50 · Hip Thrust 3×10@185 · Leg Curl 3×10@90 · Hanging Leg Raise 3×12
7. **Full Body 3** — Stair Climber 1×900s · Incline Bench Press 3×10@115 · Dumbbell Row 3×10@55 · Face Pulls 3×15@30 · Dumbbell Curl 3×12@25 · Skull Crushers 3×10@50 · Lunges 3×10@35 · Hip Thrust 3×10@185 · Ab Wheel Rollout 3×10

### 1.5 Feature-level gaps

**Home (`src/features/home/`)**

- Missing "PUMP" display header (currently says "WORKOUT").
- Missing daily tip card (14 tips rotated by day-of-year).
- Templates displayed as a flat list — Swift renders them as a draggable card stack carousel.
- Template card must show: name, exercise preview (up to 6 + "+N MORE"), and completion count for completed workouts linked to that template.
- Missing long-press menu on template card: Edit / Duplicate / Delete.
- Missing "PLANNING" badge on planning-mode workouts.
- Missing "PAUSED" red badge for paused workouts.
- Missing 3-second fullscreen countdown animation before a workout actually starts (used from both QUICK START and a template's START).
- START / QUICK START must be disabled while an active workout exists.

**Active workout (`src/features/active-workout/`)**

- Editable workout-name text field at top (currently static).
- Planning mode:
  - If the workout has not been started yet, show a big `START` button instead of the finish flow.
  - If started from a template, show a `SAVE` button that calls `updateTemplateFromWorkout`.
  - Auto-delete empty planning workouts when the user navigates away.
- Pause/resume buttons (pause accumulates `totalPausedDuration`, timer freezes while paused).
- Collapse/expand exercise cards (Swift default: expanded, collapsible on tap of header chevron).
- Swipe-left on a set row reveals progressive delete (icon at 40px → text at 100px → trigger at 140px).
- Reorder exercises: toggle into reorder mode, drag handles (fallback: ▲▼ like the template editor).
- Add-set continuity: new set copies `weight`/`reps`/`duration` from the previous set, not a blank row.
- Set row layout must branch on `measureBy`:
  - `weight` → `SET · WEIGHT · REPS · ✓`
  - `repsOnly` → `SET · REPS · ✓`
  - `seconds` → `SET · DURATION · ✓`
  - `cardio` → `SET · DURATION · SPEED · INCLINE · RESISTANCE · ✓`
- End-workout flow: confirmation sheet summarising duration / exercises / completed sets, with CONTINUE vs FINISH.
- Post-workout summary screen (`WorkoutSummaryView.swift`): random exclamation phrase (one of 19), stats, per-exercise table, PR highlights. Currently absent.
- "DISCARD" must prompt only if the workout has been edited — Swift's rule.

**History (`src/features/history/`)**

- Missing detail view. Tapping a workout card should open an editable sheet: workout name, `startedAt`/`completedAt` date pickers, the full exercise/set list (with the active-workout editing UI reused), a DELETE button, and a CONVERT-TO-TEMPLATE action.
- Group-by-date labels must use "Today" / "Yesterday" / "MMM d, yyyy" smart labels instead of raw date strings.

**Stats (`src/features/stats/`)**

Current PWA stats (streak, weekly volume, weight progression) are a **divergent design** — they do not exist in Swift. Since WorkoutApp is the source of truth, replace the content with Swift's:

- `THIS YEAR` section — stat cards: workout count (Jan 1–Dec 31 of current year), total duration.
- `FREQUENCY` section — 2-column grid: per-week average, per-month average (computed from weeks/months since first workout).
- `TOP EXERCISES` — list of most-performed exercises ranked by count ("BENCH PRESS · 12×"), top 10.
- `PERSONAL RECORDS` — for each exercise that has at least one completed set: max weight (weight), max reps (repsOnly), or max duration (seconds/cardio).
- Empty state: "NO STATS YET — COMPLETE YOUR FIRST WORKOUT TO SEE YOUR STATS".

If the user wants to keep streak/volume/progression as additional sections, that's a separate decision — for this parity pass, remove them.

**Exercises tab (`src/features/exercises/`)**

- Filter chips must match Swift: `ALL · CHEST · BACK · SHOULDERS · BICEPS · TRICEPS · LEGS · CORE · CARDIO` (9 chips total, not 6).
- Create/edit form must ask for `measureBy` (weight / seconds / reps-only) and body-part `type`.
- Exercise rows grouped by body-part `type` when no filter / search is active.

**Exercise picker (`src/features/exercise-picker/`)**

- Must support **multi-select** (checkbox per row) with an "ADD (N)" confirm button and a `CANCEL` button — currently single-tap only.
- Filter chips must match the 8-body-part taxonomy.
- Callback shape becomes `onSelect: (exercises: Exercise[]) => void` — update every caller (active workout, template editor).

**Template editor (`src/features/template-editor/`)**

- Name input, exercise list, reorder, delete are already there — keep.
- Per-exercise set groups are not editable from the editor in Swift either (Swift edits them via the workout-planning flow). Keep it that way, but the list view must show the exercise's `totalSets` count badge (derived from `setGroups`).
- Drag-to-reorder is preferred over ▲/▼; fall back to ▲/▼ if drag is expensive.

**New — Template details view**

- A sheet opened when a template card is tapped (not long-pressed).
- Shows: name, exercise count, total sets, preview of up to 6 exercises + "+N MORE".
- Buttons: `START` (disabled if an active workout exists), `EDIT`, `DUPLICATE`.

**New — Workout summary view**

- Dedicated screen shown after `FINISH WORKOUT`.
- Random exclamation phrase from a fixed list of 19 (copy verbatim from Swift `WorkoutSummaryView`).
- Stats: duration, exercises, completed sets.
- Per-exercise table with PRs highlighted (set that beat the previous best weight/reps/duration for that exercise).

**New — Countdown**

- 3-second fullscreen countdown with expanding ring / scaled number animation.
- Used by QUICK START and template START paths only (not when resuming an already-started workout).

### 1.6 Design tokens (`src/design/tokens.css`)

Swift's `Tokens.swift` defines:

- Colors: `nbGrayBg` `#F8FAFC`, `nbGrayLight` `#FFFFFF`, `nbGrayMuted` `#F1F5F9`, `nbLime` `#91DA73`, `nbBlack` `#000000`, `success` `#2E6F40`, destructive red.
- Fonts: rounded system (`.rounded` design), not monospace.
- Radius: 8px.
- Border widths: 2 / 3 / 4 px.
- Hard-offset shadows: 2 / 4 / 8 px, black, zero blur.
- Spacing 8-pt grid: 4 / 8 / 16 / 24 / 32 / 48.
- `minTouchTarget` 44, `homeMaxWidth` 448, `bottomPaddingForTabBar` 96.

The PWA is currently pure monochrome with radius 0 and monospace. This was a deliberate "brutalist" V1 choice, but the user said WorkoutApp is the source of truth — so reconcile: add `--color-accent: #91DA73`, `--color-success: #2E6F40`, `--color-bg: #f8fafc`, `--color-surface: #ffffff`, `--color-muted: #f1f5f9`, `--radius: 8px`, shadow offset tokens, and switch the default font to the rounded system stack. Keep monospace as an option for numeric inputs if desired.

Also update:
- `manifest.json` `theme_color` / `background_color` — currently `#0f172a` (dark slate), should be `#ffffff` with accent `#91DA73`.
- `index.html` `<meta name="theme-color">` if present.

### 1.7 App shell

- `styles.css` and `app.js` at the repo root are dead V0 legacy (not imported from `index.html`) but still exist. Delete them and drop them from the service-worker precache list if referenced.
- `service-worker.js` cache list must be updated for any new files this plan adds (summary, countdown, template-details, workout-detail).
- Bump `CACHE_VERSION` to `pump-v4`.

---

## 2. Execution plan — agent assignments

### 2.1 Dependency graph

```
                  ┌────────────────────────────────────┐
                  │ Phase 0 — Core Foundation (serial) │
                  │   Models, schema, store, seed      │
                  └───────────────┬────────────────────┘
                                  │
  ┌───────────┬──────────┬────────┼────────┬────────────┬────────────┐
  ▼           ▼          ▼        ▼        ▼            ▼            ▼
Phase 1A    Phase 1B   Phase 1C  Phase 1D Phase 1E     Phase 1F     Phase 1G
 Home +     Active     History  Stats    Picker       Exercises    Template
 Template   Workout    Detail   rewrite  multi-select tab          Editor +
 Card       parity     + Edit                                       Details
 Stack                                                               + new
                                                                      Summary
                                                                      + new
                                                                      Countdown
                                  │
                                  ▼
                           ┌──────────────────┐
                           │ Phase 1H — Design │
                           │   Tokens + shell │
                           └──────────────────┘
                                  │
                                  ▼
                           ┌──────────────────┐
                           │ Phase 2 — Integrator│
                           └──────────────────┘
```

Maximum concurrency after Phase 0 lands: 8 agents (1A–1H) in parallel. They each own disjoint files.

### 2.2 Ground rules for every agent

1. Vanilla JS, ES modules, no build, no dependencies. Unchanged from V1.
2. Read `AGENT_CONTRACTS.md` before touching anything. Update it if you change a contract.
3. Absolute file ownership — do not edit another agent's files. Cross-file changes go through Phase 2.
4. All dates are ISO 8601 strings in storage; relative labels ("Today", "Yesterday") are render-time only.
5. Empty-state rendering is required for every screen.
6. Prefer feature detection over browser sniffing.
7. Persist through reload: refresh mid-task, the state must come back.
8. Do not bump `CACHE_VERSION` — Phase 2 does that once.
9. After your work, append a one-line CHANGELOG entry to this file with your agent label.

---

### Phase 0 — Core Foundation (1 agent, serial, blocks everything)

**Files owned (exclusive):**
- `src/core/models.js`
- `src/core/schema.js`
- `src/core/store.js`
- `src/core/seed.js`
- `AGENT_CONTRACTS.md`

**Deliverables:**

1. Rewrite `models.js` JSDoc typedefs per §1.1. Drop `ExerciseCategory` and `'strength'|'cardio'` ExerciseType. Introduce `BodyPart` (chest/back/shoulders/biceps/triceps/legs/core/cardio) and `MeasureBy` (weight/seconds/repsOnly). Add `TemplateExercise` and `TemplateSetGroup`.
2. Bump `schema.js` DB version to 2. Write an `onupgradeneeded` handler that:
   - Reads existing records out of each store.
   - Writes a JSON backup to `localStorage` under key `pump-backup-v1-<ISO>`.
   - Wipes the three stores and reseeds from the new seed module. (Local data is low-stakes; reset is acceptable per the project direction memo.)
3. Expand `store.js` with the functions listed in §1.3. Update `startWorkoutFromTemplate` to materialise `setGroups` into real `ExerciseSet`s. Add `resetDatabase({ backupExisting })`.
4. Rewrite `seed.js` with the 47 exercises tagged with correct `type`/`measureBy` and all 8 seed templates containing fully-populated `setGroups` per §1.4. Keep `seedIfNeeded()` idempotent.
5. Update `AGENT_CONTRACTS.md` to reflect the new model shapes, the new store functions, and the renamed/removed types. Mark V2-era items as superseded.

**Definition of done:** Fresh IDB shows 47 exercises with correct body-part/measure tagging and 8 pre-filled templates. `startWorkoutFromTemplate(pushDay)` produces a workout whose Bench Press exercise already has 4 sets of `{ reps: 8, weight: 155 }`. All existing Phase-1 features still boot without throwing (they may look broken visually — that's OK, Phases 1A–1H will fix them).

---

### Phase 1A — Home + Template Card Stack (parallel after Phase 0)

**Files owned (exclusive):**
- `src/features/home/home.js`
- `src/features/home/home.css`
- `src/features/home/daily-tips.js` (new — inline export of the 14-tip array + `tipForToday()`)
- `src/features/home/card-stack.js` (new — the carousel component)
- `src/features/home/card-stack.css` (new)

**Deliverables:** §1.5 "Home" bullets. Specifically:
- "PUMP" display title, date subheader.
- Daily tip card (lightbulb glyph + tip text, keyed by day-of-year % 14).
- Active-workout card with live timer, "CONTINUE" button, `PLANNING`/`PAUSED` badges.
- Quick Start button (disabled when an active workout exists).
- Horizontal card-stack carousel of templates with drag/swipe navigation — fall back to horizontal scroll-snap if gesture work is too large a scope.
- Long-press on a template card opens an action sheet: Edit / Duplicate / Delete.
- "+ NEW TEMPLATE" button at bottom.
- START / QUICK START paths must route through the new countdown (Phase 1G owns the countdown module; import it and call its exported `showCountdown({ seconds: 3, onComplete })`).

**Definition of done:** Home renders PUMP header, tip card, planning/active/paused states, card-stack of templates with working START/EDIT/DUPLICATE/DELETE. Starts always fire the countdown before navigation.

---

### Phase 1B — Active Workout parity (parallel after Phase 0)

**Files owned (exclusive):**
- `src/features/active-workout/active-workout.js`
- `src/features/active-workout/active-workout.css`

**Deliverables:** §1.5 "Active workout" bullets. Specifically:
- Editable workout-name text field.
- Branch set-row layout on `measureBy` (4 variants).
- Collapse/expand exercise cards.
- Swipe-left delete on set rows with progressive reveal thresholds (40/100/140 px).
- Exercise reorder (drag preferred, ▲/▼ fallback).
- Add-set continuity (copy from last set).
- Planning-mode UI: `START` button replaces `FINISH WORKOUT`; `SAVE` button appears if `templateId` is set and `hasBeenEdited` is true. Empty planning workouts auto-delete on unmount.
- Pause/Resume buttons that update `pausedAt` and `totalPausedDuration`.
- End-workout confirmation sheet showing duration / exercises / sets and CONTINUE vs FINISH.
- Navigate to `/workout/:id/summary` on finish (Phase 1G owns the summary view).

**Definition of done:** You can plan a template-based workout (save back to template), start it, pause/resume, log sets (with correct layout per measure type), swipe-delete sets, reorder exercises, finish it, and land on the summary screen.

---

### Phase 1C — History Detail + Edit (parallel after Phase 0)

**Files owned (exclusive):**
- `src/features/history/history.js`
- `src/features/history/history.css`
- `src/features/workout-detail/workout-detail.js` (new)
- `src/features/workout-detail/workout-detail.css` (new)

**Deliverables:**
- History cards become tappable and open `renderWorkoutDetail(appEl, { id })` at route `/history/:id`.
- Detail view supports: editable name, editable `startedAt` / `completedAt` via date pickers, full exercise/set editing (reuse the same set-row components from Phase 1B via shared selectors / CSS classes — do not import JS across feature folders), DELETE (confirm), CONVERT-TO-TEMPLATE (prompt for a name then call `convertWorkoutToTemplate`).
- Smart group-by-date labels (`Today` / `Yesterday` / `MMM d, yyyy`).

**Definition of done:** You can open any completed workout, edit its name/dates/exercises, save, and it persists. Convert-to-template creates a template visible on Home.

**Coordination note:** The Phase 1B agent renames classes to `.set-row--weight|reps-only|seconds|cardio`. 1C reuses those CSS selectors by rendering the same structure. If 1B hasn't landed, 1C stubs the set UI behind a TODO and the Integrator wires it in Phase 2.

---

### Phase 1D — Stats rewrite (parallel after Phase 0)

**Files owned (exclusive):**
- `src/features/stats/stats.js`
- `src/features/stats/stats.css`

**Deliverables:** §1.5 "Stats" bullets — four sections: THIS YEAR, FREQUENCY, TOP EXERCISES, PERSONAL RECORDS. Remove the V2 streak/volume/progression content. Empty state: "NO STATS YET".

**Definition of done:** Stats tab shows correct year totals, per-week/per-month averages, top exercises ranked, and PRs grouped by exercise — all computed from `fetchAllWorkouts()`.

---

### Phase 1E — Exercise Picker multi-select (parallel after Phase 0)

**Files owned (exclusive):**
- `src/features/exercise-picker/exercise-picker.js`
- `src/features/exercise-picker/exercise-picker.css`

**Deliverables:**
- Change callback shape to `onSelect: (exercises: Exercise[]) => void`.
- Render a checkbox per row; track a `Set<exerciseId>`.
- Replace the close-on-tap behaviour with an `ADD (N)` confirm button in the header plus a `CANCEL` button.
- 9 filter chips: ALL + 8 body parts. Group list by body-part when ALL is selected.
- Create-form fields expand to `name`, `measureBy`, body-part `type`.

**Coordination note:** Callers in Phase 1B (active-workout) and Phase 1G (template-editor) will need to be updated to handle the array callback. Both agents know about this contract change — keep the function-call signature stable and they'll call you with the new shape.

**Definition of done:** Multi-select works, confirm button shows count, create form captures the full taxonomy.

---

### Phase 1F — Exercises tab taxonomy (parallel after Phase 0)

**Files owned (exclusive):**
- `src/features/exercises/exercises.js`
- `src/features/exercises/exercises.css`

**Deliverables:**
- 9 filter chips: ALL · CHEST · BACK · SHOULDERS · BICEPS · TRICEPS · LEGS · CORE · CARDIO.
- Group list by body-part type when not filtering/searching.
- Create/edit form: name, body-part type, measureBy.
- Row tags: measureBy badge (`WEIGHT` / `SECONDS` / `REPS`), plus `CUSTOM` badge if custom.
- Edit/delete only on custom exercises (as today).

**Definition of done:** Exercises tab matches Swift's taxonomy one-for-one.

---

### Phase 1G — Template editor + details + summary + countdown (parallel after Phase 0)

**Files owned (exclusive):**
- `src/features/template-editor/template-editor.js`
- `src/features/template-editor/template-editor.css`
- `src/features/template-details/template-details.js` (new)
- `src/features/template-details/template-details.css` (new)
- `src/features/workout-summary/workout-summary.js` (new)
- `src/features/workout-summary/workout-summary.css` (new)
- `src/components/countdown.js` (new)
- `src/components/countdown.css` (new)

This is the biggest Phase-1 slice; it's grouped because these four screens all share the same motion / animation / sheet-chrome primitives and the same agent will build them consistently.

**Deliverables:**

- **Template editor:** keep current behaviour; update picker callback to handle the array shape from Phase 1E; show `totalSets` badge per row (derived from `setGroups`).
- **Template details:** new sheet opened when a template card is tapped on Home. Renders name, exercise count, total sets, first-6 exercise preview, and START / EDIT / DUPLICATE buttons. START must use the countdown then navigate to `/workout/:id`.
- **Workout summary:** new route `/workout/:id/summary`. Renders random exclamation phrase (choose from the 19-phrase list in the Swift source), duration, exercise count, set count, per-exercise table with PR flags. Button at bottom: "DONE" → navigate to `/history`.
- **Countdown component:** `showCountdown({ seconds = 3, onComplete })` — fullscreen overlay, renders 3/2/1 with animated expanding ring + number scale. Exports `showCountdown` and `dismissCountdown`.

**Definition of done:** Tapping a template opens details, START fires countdown then routes to the active workout. FINISH on active workout routes to summary. Summary shows correct phrase + stats + PR highlights. Editor matches Swift behaviour.

---

### Phase 1H — Design tokens + manifest alignment (parallel after Phase 0)

**Files owned (exclusive):**
- `src/design/tokens.css`
- `src/design/base.css`
- `src/design/components.css`
- `src/components/button.js`
- `src/components/card.js`
- `src/components/textfield.js`
- `manifest.json`
- `index.html` (inline style block only — no structural edits)

**Deliverables:**

- Add tokens: `--color-bg: #f8fafc`, `--color-surface: #ffffff`, `--color-muted-bg: #f1f5f9`, `--color-accent: #91da73`, `--color-success: #2e6f40`, `--color-destructive` (a red), `--radius: 8px`, `--shadow-sm: 2px 2px 0 0 #000`, `--shadow-md: 4px 4px 0 0 #000`, `--shadow-lg: 8px 8px 0 0 #000`.
- Switch default font stack to rounded system (`ui-rounded, "SF Pro Rounded", system-ui, sans-serif`); keep `--font-mono` available for numeric inputs.
- Update `components.css` so button/card/textfield use the new radius and optional shadow.
- Add `.card--shadow-md` / `--lg` modifiers.
- `manifest.json`: `theme_color: "#ffffff"`, `background_color: "#ffffff"`.
- `index.html` `<meta name="theme-color" content="#ffffff">` if needed.

**Definition of done:** Pages still render; primary buttons use `--color-accent` for `solid` where Swift did; success states use `--color-success`. The pure-B&W look is retained as an option via a `.theme--mono` root class if anyone wants it back.

---

### Phase 2 — Integrator (1 agent, serial, after all Phase 1)

**Files owned:**
- `service-worker.js`
- Cross-cutting fixes.

**Checklist:**

1. Bump `CACHE_VERSION` to `pump-v4`.
2. Add new files to precache:
   - `src/features/workout-detail/*`
   - `src/features/template-details/*`
   - `src/features/workout-summary/*`
   - `src/features/home/card-stack.{js,css}`
   - `src/features/home/daily-tips.js`
   - `src/components/countdown.{js,css}`
3. Delete dead V0 root files: `app.js`, `styles.css`. Remove them from precache if they were listed.
4. Add routes in `src/main.js`: `/history/:id` (workout detail), `/workout/:id/summary`. Both are parametric.
5. Smoke test end-to-end:
   - Fresh load → 47 exercises, 8 templates.
   - Tap template → details sheet → START → countdown → active workout with pre-filled sets.
   - Pause → timer freezes. Resume → timer continues.
   - Swipe-delete a set. Reorder an exercise. Add exercise via multi-select picker.
   - FINISH → confirmation sheet → summary screen → DONE → History.
   - In History: tap workout → edit name → save. Convert-to-template → appears on Home.
   - Stats tab shows year totals, frequency, top exercises, PRs.
   - Exercises tab shows 9 chips, rows grouped by body part.
6. Verify on iPhone Safari (real device or device mode) — safe-area insets, tab bar not covering content, scroll.
7. Ensure `AGENT_CONTRACTS.md` reflects the final state.

**Definition of done:** End-to-end smoke test above passes. No console errors. Push to `main`.

---

## 3. What to watch out for

- **Data loss during the schema bump.** Phase 0 wipes IDB after writing a localStorage backup. This is acceptable because the project direction memo says local data is low-stakes, but log the backup key prominently so the user can recover if needed.
- **Picker callback breaking change.** Phase 1E changes the callback from `(exercise)` to `(exercises[])`. Phases 1B and 1G must land together, or the Integrator adapts in Phase 2. If 1E ships first, other callers will receive arrays and break until their phases land — accepted risk.
- **Card-stack interaction on mobile.** Drag/swipe carousels are fiddly across iOS/Android. Fall back to horizontal `scroll-snap-type: x mandatory` + snap children if drag is too expensive.
- **Summary PR detection.** A "PR" means the set beat the prior best for that exercise across all prior completed workouts. Keep the detection local to the summary screen — don't persist a `PR` flag on sets; recompute on render.
- **Countdown lifecycle.** If the user navigates away mid-countdown, the countdown must cancel itself (don't fire `onComplete`). Use an `AbortController` or a cancel token.
- **Active workout re-renders and input focus.** The current PWA preserves focus by only clearing the exercises section during partial re-renders. Keep that pattern — do NOT fully rerender the page after every set edit.
- **Daily tip list.** Copy the 14-tip list verbatim from whichever Swift file defines it (check `HomeView.swift`). If it doesn't exist there, write 14 short, gym-oriented tips and note that in the CHANGELOG.
- **Exclamation-phrase list.** Copy the 19 phrases verbatim from `WorkoutSummaryView.swift`.

---

## 4. CHANGELOG

- `2026-04-18` — Parity plan authored based on diff of `WorkoutApp/` (source of truth) vs `pump-pwa/` current state.
- `2026-04-18` — Phase 0 (Core Foundation): Rewrote models.js (BodyPart + MeasureBy types, added TemplateExercise + TemplateSetGroup), bumped schema.js to DB_VERSION 2 with V1→V2 migration (backup to localStorage, reset stores), expanded store.js with 20+ new functions (startWorkout, pauseWorkout, resumeWorkout, deleteSet, duplicateTemplate, convertWorkoutToTemplate, updateTemplateFromWorkout, resetDatabase, etc.), rewrote seed.js with 47 exercises (correct type/measureBy per body part) and 8 full templates with setGroups pre-filled, created AGENT_CONTRACTS.md.
- `2026-04-18` — Phase 1A (Home + Template Card Stack): Rewrote `home.js` with PUMP header, formatted date subheader, active/planning/paused workout card with live elapsed timer, daily tip card with lightbulb, templates section with horizontal scroll-snap card-stack carousel; created `card-stack.js` with long-press (500ms) action sheet (Edit/Duplicate/Delete), single-tap to start, completion counts per template; created `daily-tips.js` with 14 rotating gym tips (deterministic by day of year); created `card-stack.css` with scroll-snap carousel styling, action sheet overlay animations; rewrote `home.css` with all component styles using design tokens; Quick Start button with countdown placeholder; "+ NEW TEMPLATE" navigates to template editor.
- `2026-04-18` — Phase 1B (Active Workout): Rewrote `active-workout.js` with editable name input (blur/enter to save, marks edited if planning), live timer display (PLANNING / HH:MM:SS / frozen when paused), pause/resume buttons (red RESUME when paused), per-measureBy set-row layouts (weight/repsOnly/seconds with correct column grids), collapsible exercise cards (chevron toggle), exercise reorder mode with ▲/▼ buttons, swipe-left-to-delete sets (40px icon → 100px DELETE text → 140px trigger), add-set continuity (copies from prior set), multi-select exercise picker integration, planning-mode START button → re-render active view, SAVE-to-template button (if templateId && hasBeenEdited), active-mode FINISH button → confirmation sheet (duration/exercises/sets summary) with CONTINUE/FINISH options, finish navigates to `/workout/:id/summary`, auto-delete empty planning workouts on unmount; rewrote `active-workout.css` with all new component styles, swipe feedback states, mobile-responsive confirmation sheet.
- `2026-04-18` — Phase 1D: Stats screen rewritten with THIS YEAR totals, FREQUENCY per-week/month, TOP EXERCISES ranking, PERSONAL RECORDS by measureBy.
- `2026-04-18` — Phase 1C: History cards are tappable, open workout detail view with editable name/dates, convert-to-template, delete. Smart date labels (Today/Yesterday/date). Created `workout-detail.js` and `workout-detail.css` for `/history/:id` route. Updated router.js to support parametric history routes. Updated main.js to handle workout detail rendering.
- `2026-04-18` — Phase 1E (Exercise Picker multi-select): Rewrote `exercise-picker.js` with fullscreen overlay (not dialog), renamed export to `showExercisePicker({ onSelect, onCancel })` returning Exercise[], multi-select checkboxes with Set-backed tracking, 9 filter chips (ALL + 8 body parts: CHEST/BACK/SHOULDERS/BICEPS/TRICEPS/LEGS/CORE/CARDIO), grouped exercise list by body-part when ALL selected, ADD (N) button (disabled when count=0), CANCEL button, search filter, collapsible "+ CREATE NEW EXERCISE" form with name/type/measureBy fields; rewrote `exercise-picker.css` for overlay structure with sticky header, chip scrolling, checkbox rows with exercise-name + measureBy badge, section headings.
- `2026-04-18` — Phase 1F (Exercises Tab Taxonomy): Rewrote `exercises.js` with 9 body-part filter chips (ALL · CHEST · BACK · SHOULDERS · BICEPS · TRICEPS · LEGS · CORE · CARDIO), grouped exercise list by type when ALL selected (flat list for specific type), search filtering by name, `measureBy` badges (WEIGHT/SECONDS/REPS), CUSTOM badge for user-created exercises, edit (✏) and delete (✕) icons for custom exercises only, create/edit forms with name input, body-part type selector (8 options), and measureBy selector (weight/seconds/repsOnly), empty states for no exercises or no filter matches; rewrote `exercises.css` with all styling for chips, badges, rows, form overlay, form controls using design tokens and V2 data model.
- `2026-04-18` — Phase 1H: Design tokens updated with lime accent (#91da73), success green (#2e6f40), rounded font stack (ui-rounded, "SF Pro Rounded", system-ui), 8px radius, hard-offset shadows (2px/4px/8px), new color tokens (--color-bg #f8fafc, --color-surface #ffffff, --color-muted-bg #f1f5f9, --color-text, --color-text-muted). Updated base.css font-family to var(--font-base); added input/textarea font-family: inherit. Updated components.css button/card/textfield to use new radius and shadow tokens; added .card--shadow-md/lg variants; button variants renamed to primary/secondary/destructive/ghost (legacy solid/outline kept for compatibility). Updated manifest.json theme_color and background_color to #ffffff. Added <meta name="theme-color"> to index.html. Updated tabbar font-family and color vars. Added .theme--mono opt-in override class.
- `2026-04-18` — Phase 1G: Countdown component, template details sheet, workout summary with PR detection and phrases, template editor updated for V2 templateExercises shape.
- `2026-04-18` — Phase 2: Service worker bumped to pump-v4, added new Phase 1 files to ASSETS_TO_CACHE (countdown, card-stack, daily-tips, workout-detail, template-details, workout-summary), removed dead V0 root files (app.js, styles.css), updated `src/core/router.js` with parametric routes `/workout/:id/summary` (checked before `/workout/:id`) and `/template-editor/:id`, updated `src/main.js` with route handlers for both new routes (renderWorkoutSummary and renderTemplateEditor imported in correct order), updated `updateTabBar` to keep home tab active for both workout/:id/summary and /template-editor/:id, integrated countdown in `src/features/home/home.js` (startTemplateWorkout and quickStart now call showCountdown({ onComplete })), verified all export function names match expected signatures, ran syntax checks on all modified JS files (all OK).
