# SwiftUI → PWA Migration Plan

Port the `WorkoutApp` SwiftUI codebase at `~/Documents/WorkoutApp/` to the `pump-pwa` Progressive Web App at `~/Documents/pump-pwa/`. Goal: strict feature parity, nothing extra.

This plan is designed for a **swarm of parallel subagents**. Work is sliced by file ownership so agents can run concurrently without merge conflicts. Each task has explicit inputs, outputs, file boundaries, and a verification gate.

---

## Ground rules (read first — applies to every agent)

1. **Stack is locked.** Vanilla JS + ES modules. No build step. No framework. No TypeScript (use JSDoc for types). No Tailwind. No npm dependencies. If you think you need one, stop and escalate.
2. **Single-file scaffold is being expanded, not rewritten.** The current `app.js` / `index.html` / `styles.css` already work and are deployed on GitHub Pages. Do not break the deployment. The service worker shell cache is live — bump `CACHE_VERSION` in `service-worker.js` whenever you change the file list.
3. **Storage is local-only.** IndexedDB. No backend, no sync, no auth. iOS 7-week eviction is an accepted risk.
4. **Feature parity = what exists in the Swift app.** No rest timers, no progression charts, no CSV export, no data migration from the Swift app. The Swift app dies when the PWA ships.
5. **Preserve the brutalist aesthetic** from `WorkoutApp/Core/Design/Tokens.swift`: monospaced everything, white/black palette, zero-radius corners, 2px borders, 8pt spacing grid, uppercase UI labels.
6. **File ownership is exclusive.** If your task lists `src/features/home/*`, no other agent touches those files. If you need something outside your scope, add it to the shared interfaces doc (Phase 0) — don't reach into another agent's files.
7. **Every task ends with a verification step.** Agents must run the PWA locally (`python3 -m http.server 5173`) and confirm their feature works in Safari on desktop at minimum. The final Phase 2 agent does full device verification.

---

## Source-of-truth mapping

| SwiftUI concept | PWA equivalent |
|---|---|
| `@Observable` + `@State` view models | ES module with exported state object + DOM re-render function |
| `SwiftData` `@Model` classes | IndexedDB object stores with JSDoc-typed plain objects |
| `NavigationStack` + `TabView` | Hash-based router + tab bar (`#/home`, `#/history`, `#/workout/<id>`) |
| `.sheet(isPresented:)` | Modal `<dialog>` elements |
| `Tokens.swift` design tokens | `src/design/tokens.css` custom properties |
| `BrutalistButton` / `BrutalistCard` / `BrutalistTextField` | Styled component functions returning HTML strings (or custom elements) |
| `DataStore.shared` singleton | `src/core/store.js` module exporting async CRUD functions |

---

## Target directory structure

Established in Phase 0 and treated as immutable by later agents:

```
pump-pwa/
├── index.html                  # entry — Phase 0 rewrites this
├── manifest.json               # unchanged
├── service-worker.js           # Phase 2 updates cache list + version
├── icon-*.png                  # unchanged
├── styles.css                  # Phase 0 DELETES this, replaced by src/design/
├── app.js                      # Phase 0 DELETES this, replaced by src/main.js
├── MIGRATION_PLAN.md           # this file
└── src/
    ├── main.js                 # entry point — boots router, mounts app shell
    ├── core/
    │   ├── store.js            # IndexedDB CRUD — the "DataStore" equivalent
    │   ├── schema.js           # DB schema, version, migrations
    │   ├── models.js           # JSDoc typedefs for Workout, Exercise, etc.
    │   ├── seed.js             # exercise library + default templates seed
    │   ├── router.js           # hash-based routing
    │   └── format.js           # date / duration / display formatters
    ├── design/
    │   ├── tokens.css          # CSS custom properties from Tokens.swift
    │   ├── base.css            # reset, body, safe-area, typography defaults
    │   └── components.css      # BrutalistButton/Card/TextField styles
    ├── components/
    │   ├── button.js           # renderButton({ title, variant, onClick })
    │   ├── card.js             # renderCard({ children, shadow })
    │   └── textfield.js        # renderTextField({ placeholder, value, onInput })
    └── features/
        ├── home/
        │   ├── home.js         # view + state
        │   └── home.css        # scoped styles
        ├── active-workout/
        │   ├── active-workout.js
        │   └── active-workout.css
        ├── history/
        │   ├── history.js
        │   └── history.css
        └── exercise-picker/
            ├── exercise-picker.js
            └── exercise-picker.css
```

---

## Dependency graph

```
                    ┌─────────────────────┐
                    │ Phase 0: Architect  │
                    │   (blocks all)      │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
    ┌───────────┐        ┌───────────┐        ┌───────────┐
    │ Phase 1A  │        │ Phase 1A  │        │ Phase 1A  │
    │  Store    │        │   Seed    │        │Components │
    └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
          └────────────────────┼────────────────────┘
                               ▼
        ┌────────────┬─────────┴──────────┬────────────┐
        ▼            ▼                    ▼            ▼
  ┌──────────┐ ┌──────────────┐   ┌──────────┐  ┌──────────────┐
  │Phase 1B  │ │  Phase 1B    │   │Phase 1B  │  │  Phase 1B    │
  │  Home    │ │ActiveWorkout │   │ History  │  │ExercisePicker│
  └──────────┘ └──────────────┘   └──────────┘  └──────────────┘
        └────────────┴──────────────┬──────┴────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │ Phase 2: Integrator │
                         └─────────────────────┘
```

---

# Phase 0 — Foundation Architect (1 agent, serial)

**Role:** Lay down the skeleton that every subsequent agent builds on. This agent writes very little product code — it writes *contracts*. The quality of its output determines whether Phase 1 can run in parallel without conflicts.

**Blocks:** every other phase.

**Files owned (exclusive):**
- Creates the entire `src/` directory tree (empty stubs where needed)
- `index.html` (rewrite)
- `src/main.js`
- `src/core/schema.js`
- `src/core/models.js` (JSDoc typedefs only — no logic)
- `src/core/router.js`
- `src/core/format.js`
- `src/design/tokens.css`
- `src/design/base.css`
- `AGENT_CONTRACTS.md` (sibling to this file — the interface spec Phase 1 agents follow)
- Deletes `app.js` and `styles.css` at the repo root (their contents are now split across `src/`)

**Deliverables:**

1. **`src/design/tokens.css`** — direct port of `Tokens.swift`:
   - `--color-bg: #ffffff; --color-fg: #000000;` etc.
   - `--font-display/heading/subheading/body/caption/data` using `ui-monospace, "SF Mono", Menlo, monospace` stack
   - `--space-xs: 4px` through `--space-xxl: 48px`
   - `--border-width: 2px; --border-width-thick: 4px;`
   - `--radius: 0;`
   - `--touch-target: 44px;`
   - `--anim-duration: 150ms;`
   - Dark theme is **discarded** — this is a white/black brutalist app per Swift tokens.

2. **`src/core/schema.js`** — IndexedDB schema + `openDb()`. Object stores:
   - `workouts` (keyPath `id`, indexes: `startedAt`, `completedAt`)
   - `exercises` (keyPath `id`, indexes: `name`, `category`)
   - `templates` (keyPath `id`, index: `order`)
   - Note: Swift nested `WorkoutExercise` / `ExerciseSet` as cascade relationships. In IndexedDB, store them **embedded inside the workout document** (array of exercises, each with array of sets). This matches how they're always read/written together and avoids manual cascade logic.
   - Version `1` initially. Schema migrations handled in `onupgradeneeded`.

3. **`src/core/models.js`** — JSDoc typedefs (no runtime code):
   ```js
   /**
    * @typedef {'push'|'pull'|'legs'|'core'|'cardio'} ExerciseCategory
    * @typedef {'strength'|'cardio'} ExerciseType
    * @typedef {object} Exercise
    * @property {string} id
    * @property {string} name
    * ...
    */
   ```
   Mirror all five Swift models: `Exercise`, `ExerciseSet`, `WorkoutExercise`, `Workout`, `Template`. IDs are strings (use `crypto.randomUUID()`), not UUID objects. Dates are ISO strings, not `Date` objects (for IndexedDB index safety).

4. **`src/core/router.js`** — hash-based router.
   - Routes: `#/` (home, default), `#/history`, `#/workout/:id`, `#/picker` (modal overlay).
   - Export: `navigate(path)`, `currentRoute()`, `onRouteChange(handler)`.
   - Must trigger re-renders of the correct feature module when the hash changes.

5. **`src/core/format.js`** — port Swift computed properties:
   - `formatDuration(seconds)` → `"45 MIN"` or `"1H 23M"`
   - `formatStrengthSet({ weight, reps })` → `"135 × 8"`
   - `formatCardioSet({ duration, speed, incline, resistance })` → `"30 min · 6.5 mph · 2% incline"`
   - `formatCurrentDate()` → `"SATURDAY, APR 18"` (uppercase, matches `HomeView`)

6. **`src/main.js`** — boots the app:
   - Call `await openDb()` then `await seedIfNeeded()` from `seed.js`
   - Register service worker
   - Mount tab bar (Home / History) into `index.html`
   - Wire router, render initial route

7. **`index.html`** — shell:
   - `<main id="app">` mount point
   - `<nav id="tabbar">` with HOME and HISTORY tabs
   - `<dialog id="modal">` for sheets (ExercisePicker)
   - `<script type="module" src="./src/main.js"></script>`
   - Remove all inline content from the spike — those sections are now feature modules.

8. **`AGENT_CONTRACTS.md`** — the contract document that Phase 1 agents must follow. Must include:
   - Import surface of `src/core/store.js` (function signatures with JSDoc, even though the implementation is in Phase 1A).
   - Import surface of `src/components/*.js`.
   - The router's public API and how features register render functions.
   - The CSS class naming convention (BEM-ish: `.home__card`, `.picker__chip--selected`).
   - An explicit list of CSS custom properties available from `tokens.css`.
   - The shape of every model in `models.js`.

**Definition of done:**
- `python3 -m http.server 5173` serves a page with Home and History tabs, both empty, using brutalist white/black design. No errors in console. Router switches between tabs on click. Service worker still registers.
- `AGENT_CONTRACTS.md` exists and is complete enough that a Phase 1 agent could implement their module against it without reading any other agent's code.

---

# Phase 1A — Foundation modules (3 agents, parallel)

All three unblock on Phase 0 completion. They do not touch each other's files.

## Phase 1A.1 — Data Store agent

**Role:** The IndexedDB CRUD layer. This is the direct port of `DataStore.swift`.

**Files owned (exclusive):** `src/core/store.js`

**Depends on:** `src/core/schema.js`, `src/core/models.js` (read-only).

**Deliverables — port every method from `DataStore.swift`:**
- `fetchExercises()` / `fetchExercises(category)` — sorted by name
- `createExercise({ name, category, type })` — sets `isCustom: true`
- `fetchTemplates()` — sorted by `order`
- `fetchActiveWorkout()` — the single workout with no `completedAt`
- `fetchCompletedWorkouts()` — sorted by `startedAt` desc
- `createWorkout({ name, templateId })`
- `startWorkoutFromTemplate(template)` — creates workout + embedded `WorkoutExercise`s each with one empty `ExerciseSet` (mirrors Swift behavior)
- `completeWorkout(workout)` — sets `completedAt = new Date().toISOString()`
- `deleteWorkout(workout)`
- `saveWorkout(workout)` — persists mutations to an in-memory workout object (analog of `modelContext.save()`)
- Mutation helpers for nested data: `addSetTo(workout, workoutExerciseId)`, `updateSet(workout, setId, { weight, reps })`, `toggleSetCompleted(workout, setId)`, `addExerciseToWorkout(workout, exercise)`, `removeExerciseFromWorkout(workout, workoutExerciseId)`.

All functions are `async`. All return plain JS objects matching the JSDoc types in `models.js`. No observable/signal layer — features re-fetch and re-render on mutation (simpler, matches SwiftUI's view model `refresh()` pattern).

**Definition of done:** A test HTML page at `src/core/store.test.html` (or equivalent — not shipped) exercises every function and confirms persistence across reloads. Can be deleted before Phase 2 merge.

---

## Phase 1A.2 — Seed data agent

**Role:** Port `ExerciseLibrary.swift` verbatim plus the first-launch seeding logic.

**Files owned (exclusive):** `src/core/seed.js`

**Depends on:** `src/core/store.js` (import surface from AGENT_CONTRACTS.md is enough — this agent can stub the calls and the Data Store agent's real implementation will plug in).

**Deliverables:**
- Array of ~50 exercises, copied 1:1 from the Swift file (categories: push, pull, legs, core, cardio; types: strength/cardio). Do not paraphrase names — match exactly.
- Array of 4 templates: Push Day, Pull Day, Leg Day, Core Day, with the same exercise name lists as Swift.
- `seedIfNeeded()` function: if `fetchExercises()` returns empty, create all exercises first, then create templates (templates reference exercise IDs, so order matters).

**Definition of done:** On a fresh IndexedDB (delete storage, reload), Home tab shows the 4 templates with correct exercise counts (5, 5, 5, 4).

---

## Phase 1A.3 — Design Components agent

**Role:** Port `BrutalistButton`, `BrutalistCard`, `BrutalistTextField` into reusable JS component functions + their shared CSS.

**Files owned (exclusive):** `src/components/button.js`, `src/components/card.js`, `src/components/textfield.js`, `src/design/components.css`

**Depends on:** `src/design/tokens.css` (read-only — uses its CSS custom properties).

**Deliverables:**

- `renderButton({ title, variant = 'solid' | 'outline', onClick, disabled })` — returns an `HTMLButtonElement`. Styles: solid = black bg, white text, 2px border, monospaced uppercase; outline = white bg, black text, 2px border. Active state presses down 2px (matches Swift's `BrutalistButton` shadow behavior — look at `WorkoutApp/Core/Design/Components/BrutalistButton.swift` for the exact effect).
- `renderCard({ children, shadow = false })` — 2px black border, zero-radius, white bg. With `shadow: true`, applies the "BrutalistCardShadow" offset drop-shadow (4px right + 4px down, solid black).
- `renderTextField({ placeholder, value, type = 'text', inputMode, onInput })` — 2px border, no radius, monospaced font.
- All components use the uppercase-by-default typography from tokens.
- Minimum 44px touch target on every interactive element.

**Definition of done:** A gallery page at `src/components/gallery.html` (not shipped) renders one of each component and visually matches the SwiftUI screenshots of the brutalist design system. Delete before Phase 2.

---

# Phase 1B — Features (4 agents, parallel)

All four unblock on Phase 1A completion. They do not touch each other's files or any Phase 0/1A files.

## Phase 1B.1 — Home feature agent

**Role:** Port `HomeView.swift` + `HomeViewModel.swift`.

**Files owned (exclusive):** `src/features/home/home.js`, `src/features/home/home.css`

**Reference:** `WorkoutApp/Features/Home/HomeView.swift` (143 lines), `HomeViewModel.swift` (36 lines).

**Deliverables:**
- Header: "WORKOUT" display text + current date in uppercase (`formatCurrentDate`).
- Active workout section (only if one exists): card with workout name, live-ticking duration, CONTINUE button → navigates to `#/workout/<id>`.
- Quick Start button (hidden if active workout exists) → creates ad-hoc workout named "Workout" and navigates.
- Templates section: renders each template as a card with name + `<N> EXERCISES` + START button (disabled if active workout exists). START creates a workout from template and navigates.
- Accessibility labels per the Swift view.
- Re-renders when the route returns to `#/` (user may have just completed/discarded a workout).

**Definition of done:** Can start a workout from each of the 4 templates and from Quick Start. Active workout card appears and CONTINUE works. Duration updates every second while active.

---

## Phase 1B.2 — ActiveWorkout feature agent

**Role:** Port `ActiveWorkoutView.swift` + `ActiveWorkoutViewModel.swift`. This is the most complex feature (~370 lines of Swift).

**Files owned (exclusive):** `src/features/active-workout/active-workout.js`, `src/features/active-workout/active-workout.css`

**Reference:** `WorkoutApp/Features/ActiveWorkout/*.swift`.

**Deliverables:**
- Header: workout name + live duration.
- Exercises section: one card per `WorkoutExercise`, showing:
  - Exercise name (uppercase) + remove × button (with confirm dialog).
  - Column headers: SET / WEIGHT / REPS (strength) or SET / DURATION (cardio).
  - One row per set with editable weight/reps inputs (`inputmode="decimal"` / `"numeric"`), a 24×24 checkbox-style toggle, and set index.
  - "+ SET" button at bottom of each card.
- "+ ADD EXERCISE" outline button → opens ExercisePicker modal (dispatches event or calls picker's show function per AGENT_CONTRACTS).
- "FINISH WORKOUT" solid button → calls `completeWorkout` + navigates back to `#/`.
- "DISCARD" text button → confirm dialog → deletes workout + navigates back.
- Debounced persistence on input changes (250ms) to avoid write-per-keystroke.

**Definition of done:** Can log a full workout: add exercises, add/edit sets, mark complete, finish. Duration ticks. Reloading mid-workout preserves all state.

---

## Phase 1B.3 — History feature agent

**Role:** Port `HistoryView.swift` + `HistoryViewModel.swift`.

**Files owned (exclusive):** `src/features/history/history.js`, `src/features/history/history.css`

**Reference:** `WorkoutApp/Features/History/*.swift` (~200 lines total).

**Deliverables:**
- Empty state: "NO WORKOUTS YET" + caption.
- Workout list grouped by date with sticky section headers (use `position: sticky` on the section header).
- Per-workout card: name + × delete button (with confirm), DURATION / EXERCISES / SETS stat row, first 3 exercise names + "+ N MORE".
- No tap-through (the Swift version doesn't navigate into historical workouts either).
- Refresh when navigating back from ActiveWorkout (newly completed workouts appear).

**Definition of done:** After completing a workout, it appears at top of History grouped under today's date. Deleting works with undo-less confirmation.

---

## Phase 1B.4 — ExercisePicker feature agent

**Role:** Port `ExercisePickerView.swift` + `ExercisePickerViewModel.swift`.

**Files owned (exclusive):** `src/features/exercise-picker/exercise-picker.js`, `src/features/exercise-picker/exercise-picker.css`

**Reference:** `WorkoutApp/Features/ExercisePicker/*.swift` (~320 lines).

**Deliverables:**
- Modal presentation (via the shared `<dialog id="modal">` from Phase 0).
- Search input (debounced, case-insensitive substring match on `name`).
- Horizontal scrolling category filter chips: ALL, PUSH, PULL, LEGS, CORE, CARDIO. Selected chip = inverted colors.
- Exercise list grouped by category with sticky section headers. Shows exercise name + STRENGTH/CARDIO tag. Custom exercises show "CUSTOM" caption.
- Tap → returns exercise to caller (ActiveWorkout) + dismisses modal.
- "+ NEW" toolbar button → opens CreateExerciseSheet (name field + category segmented control + type segmented control + CREATE button).
- Expose a simple imperative API: `openExercisePicker({ onSelect })` / `closeExercisePicker()` — documented in AGENT_CONTRACTS.

**Definition of done:** From ActiveWorkout, picker opens, search and filter work, selecting an exercise adds it to the workout. Creating a custom exercise makes it appear in the list and the seed library.

---

# Phase 2 — Integrator (1 agent, serial, after all Phase 1B agents)

**Role:** Wire everything together, update PWA infra, verify end-to-end, ship.

**Files owned (exclusive):** `service-worker.js`, `manifest.json` (if needed), `README.md` (update "Next steps" section), plus any cross-cutting fixes.

**Deliverables:**

1. **Update `service-worker.js`:**
   - Bump `CACHE_VERSION` (e.g., `v2`).
   - Replace the shell asset list with the new file tree under `src/` plus `index.html`, `manifest.json`, `icon-*.png`.
   - Confirm network-first navigation still works.

2. **Clean up artifacts:**
   - Delete any test harnesses agents left behind (`*.test.html`, `gallery.html`).
   - Delete the old `app.js` / `styles.css` if Phase 0 didn't already.
   - Delete the "Spike checks" section from the UI — it was scaffolding, not a feature.

3. **Accessibility pass:**
   - Every interactive element has an accessible name.
   - Keyboard navigation works for the tab bar, forms, and modal.
   - `aria-current="page"` on the active tab.
   - Focus trap in the exercise-picker modal.

4. **End-to-end verification checklist** (must all pass on the deployed GitHub Pages URL, tested on iPhone Safari after Add-to-Home-Screen):
   - [ ] App loads offline (airplane mode after first load).
   - [ ] Seed data appears on first launch.
   - [ ] Can start a workout from each of the 4 templates + Quick Start.
   - [ ] Can add exercises, add/edit/complete sets, finish workout.
   - [ ] Can discard a workout.
   - [ ] Can create a custom exercise and use it.
   - [ ] History shows completed workouts grouped by date.
   - [ ] Can delete a historical workout.
   - [ ] Reloading mid-workout preserves all state (IndexedDB works).
   - [ ] Safe-area insets respected in standalone mode (no content under the notch or home bar).
   - [ ] Pushing an update (bump `CACHE_VERSION` + redeploy) propagates to the installed home-screen app on next launch.

5. **Update `README.md`:**
   - Remove the "Next steps (after the spike)" section.
   - Add a brief architecture overview pointing to this plan.
   - Note that the SwiftUI app is archived / deprecated.

**Definition of done:** All checklist items green on a real iPhone. Commit the version bump, push, confirm GitHub Pages redeploys.

---

## Parallelism summary

| Wave | Agents | Runs in parallel? | Blocks on |
|---|---|---|---|
| 0 | Architect | no (solo) | — |
| 1A | Data Store, Seed, Components | **yes, 3 parallel** | Phase 0 |
| 1B | Home, ActiveWorkout, History, ExercisePicker | **yes, 4 parallel** | Phase 1A (all three) |
| 2 | Integrator | no (solo) | Phase 1B (all four) |

Maximum concurrency: 4 agents (Phase 1B). Critical path: Phase 0 → Phase 1A.1 (longest of the 1A trio, likely the store agent) → Phase 1B.2 (longest of 1B, almost certainly ActiveWorkout) → Phase 2.

## What can go wrong

- **Agents drift from the contracts doc.** Mitigation: Phase 0 must be thorough. Every exported function signature in `store.js` and every component prop is specified up front. Phase 1 agents read `AGENT_CONTRACTS.md`, not each other's code.
- **IndexedDB schema mistakes cascade.** Mitigation: Phase 0 owns `schema.js`. Phase 1A data-store agent inherits it and should not change the schema. If migration is needed later, bump DB version.
- **CSS bleed between features.** Mitigation: feature CSS uses a scoped prefix (`.home__*`, `.active-workout__*`). Tokens + components are the only shared CSS.
- **Embedded vs. normalized data in IndexedDB.** This plan chooses embedded (workout contains exercises contains sets). If a feature ever needs to query "all sets ever of exercise X across workouts," that would require denormalization — out of scope for parity since the Swift app doesn't do that either.
- **iOS storage eviction.** Accepted risk. Not addressed in this plan.

## Out of scope (explicitly)

- CSV / JSON export.
- Per-exercise progression views or charts.
- Rest timers.
- Data migration from the SwiftUI app's SwiftData store.
- Push notifications, HealthKit, Apple Watch, any native integration.
- Cloud sync, accounts, backup.
- Tests (unit or e2e) as shipped artifacts. Agents can use throwaway test pages during development but strip them before Phase 2.
