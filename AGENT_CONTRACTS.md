# Pump PWA Agent Contracts (Phase 0 — V2)

This document defines the contracts between agents working on the Pump PWA. All agents MUST implement against these specs without deviating or reading other agents' code.

---

## Data Models

All models are defined in `src/core/models.js` as JSDoc typedefs. These are the source of truth.

### BodyPart
```ts
type BodyPart = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'core' | 'cardio'
```

### MeasureBy
```ts
type MeasureBy = 'weight' | 'seconds' | 'repsOnly'
```

### Exercise
```ts
interface Exercise {
  id: string                      // UUID
  name: string                    // e.g. "Bench Press"
  type: BodyPart                  // body-part classification
  measureBy: MeasureBy            // how sets are measured
  isCustom: boolean               // true if user-created
}
```

### ExerciseSet
```ts
interface ExerciseSet {
  id: string                      // UUID
  order: number                   // 0-based position within exercise
  weight: number | null           // pounds (for weight exercises)
  reps: number | null             // reps (for strength/repsOnly)
  duration: number | null         // seconds (for timed exercises)
  speed: number | null            // mph (for cardio)
  incline: number | null          // percent (for cardio)
  resistance: number | null       // level (for cardio)
  isCompleted: boolean
}
```

### WorkoutExercise
```ts
interface WorkoutExercise {
  id: string                      // UUID
  order: number                   // 0-based position within workout
  exerciseId: string              // Reference to Exercise.id
  exerciseName: string            // Cached name for display
  measureBy: MeasureBy            // how this exercise's sets are measured
  sets: ExerciseSet[]
}
```

### Workout
```ts
interface Workout {
  id: string                      // UUID
  name: string
  templateId: string | null       // Reference to Template.id
  createdAt: string               // ISO 8601 timestamp (when workout was created)
  startedAt: string | null        // ISO 8601 timestamp (null = planning mode)
  completedAt: string | null      // ISO 8601 timestamp (null = not finished)
  pausedAt: string | null         // ISO 8601 timestamp (null = not paused)
  totalPausedDuration: number     // accumulated paused seconds
  hasBeenEdited: boolean          // true if user modified in planning mode
  exercises: WorkoutExercise[]

  // Derived states (not stored, computed):
  // isPlanning = (startedAt === null)
  // isActive = (startedAt !== null && completedAt === null && pausedAt === null)
  // isPaused = (pausedAt !== null)
  // isPromoted = (startedAt !== null || hasBeenEdited)
}
```

### TemplateSetGroup
```ts
interface TemplateSetGroup {
  id: string                      // UUID
  order: number                   // 0-based position within exercise
  sets: number                    // count of sets in this group
  reps: number | null             // reps per set (for strength)
  weight: number | null           // weight in pounds per set
  duration: number | null         // duration in seconds per set
}
```

### TemplateExercise
```ts
interface TemplateExercise {
  id: string                      // UUID
  order: number                   // 0-based position within template
  exerciseId: string              // Reference to Exercise.id
  exerciseName: string            // Cached name for display
  setGroups: TemplateSetGroup[]   // grouped sets with pre-filled parameters
}
```

### Template
```ts
interface Template {
  id: string                      // UUID
  name: string
  order: number                   // display order (0, 1, 2, ...)
  isCustom: boolean               // true if user-created
  templateExercises: TemplateExercise[]
}
```

---

## Data Store API (Phase 0)

**File:** `src/core/store.js`

All functions are async. All return objects matching the models above. All errors should be logged; throwing is acceptable for critical failures.

### Exercise Operations

```js
/**
 * Fetch all exercises, optionally filtered by body-part type
 * @param {BodyPart} [type] - If provided, filter to this body part
 * @returns {Promise<Exercise[]>}
 */
export async function fetchExercises(type) { ... }

/**
 * Create a new custom exercise
 * @param {{ name: string, type: BodyPart, measureBy: MeasureBy, isCustom?: boolean }} data
 * @returns {Promise<Exercise>}
 */
export async function createExercise(data) { ... }

/**
 * Update an existing exercise
 * @param {Exercise} exercise
 * @returns {Promise<Exercise>}
 */
export async function updateExercise(exercise) { ... }

/**
 * Delete an exercise
 * @param {Exercise} exercise
 * @returns {Promise<void>}
 */
export async function deleteExercise(exercise) { ... }
```

### Template Operations

```js
/**
 * Fetch all templates, sorted by order field
 * @returns {Promise<Template[]>}
 */
export async function fetchTemplates() { ... }

/**
 * Create a new template
 * @param {{ name: string, templateExercises: TemplateExercise[], order?: number, isCustom?: boolean }} data
 * @returns {Promise<Template>}
 */
export async function createTemplate(data) { ... }

/**
 * Update an existing template
 * @param {Template} template
 * @returns {Promise<Template>}
 */
export async function updateTemplate(template) { ... }

/**
 * Delete a template
 * @param {Template} template
 * @returns {Promise<void>}
 */
export async function deleteTemplate(template) { ... }

/**
 * Duplicate a template (deep copy with "Copy of X" naming)
 * @param {Template} template
 * @returns {Promise<Template>}
 */
export async function duplicateTemplate(template) { ... }
```

### Workout CRUD

```js
/**
 * Fetch the active workout (started but not completed)
 * @returns {Promise<Workout | null>}
 */
export async function fetchActiveWorkout() { ... }

/**
 * Fetch all completed workouts, sorted by startedAt descending
 * @returns {Promise<Workout[]>}
 */
export async function fetchCompletedWorkouts() { ... }

/**
 * Fetch all workouts (completed and active), sorted by startedAt descending
 * @returns {Promise<Workout[]>}
 */
export async function fetchAllWorkouts() { ... }

/**
 * Create a new workout in planning mode
 * @param {{ name: string, templateId?: string }} data
 * @returns {Promise<Workout>}
 */
export async function createWorkout(data) { ... }

/**
 * Start a planning-mode workout (sets startedAt)
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function startWorkout(workout) { ... }

/**
 * Pause a running workout (sets pausedAt)
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function pauseWorkout(workout) { ... }

/**
 * Resume a paused workout (accumulates totalPausedDuration, clears pausedAt)
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function resumeWorkout(workout) { ... }

/**
 * Mark a workout as completed
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function completeWorkout(workout) { ... }

/**
 * Delete a workout
 * @param {Workout} workout
 * @returns {Promise<void>}
 */
export async function deleteWorkout(workout) { ... }

/**
 * Save a workout (full overwrite)
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function saveWorkout(workout) { ... }
```

### Workout Editing

```js
/**
 * Update workout name and mark as edited if in planning mode
 * @param {Workout} workout
 * @param {string} name
 * @returns {Promise<Workout>}
 */
export async function updateWorkoutName(workout, name) { ... }

/**
 * Update workout dates (for history editing)
 * @param {Workout} workout
 * @param {string | null} startedAt
 * @param {string | null} completedAt
 * @returns {Promise<Workout>}
 */
export async function updateWorkoutDates(workout, startedAt, completedAt) { ... }

/**
 * Mark a workout as edited
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function markWorkoutAsEdited(workout) { ... }
```

### Workout Exercise Mutations

```js
/**
 * Add an exercise to a workout
 * @param {Workout} workout
 * @param {Exercise} exercise
 * @returns {Promise<Workout>}
 */
export async function addExerciseToWorkout(workout, exercise) { ... }

/**
 * Remove an exercise from a workout
 * @param {Workout} workout
 * @param {string} workoutExerciseId
 * @returns {Promise<Workout>}
 */
export async function removeExerciseFromWorkout(workout, workoutExerciseId) { ... }

/**
 * Reorder exercises in a workout
 * @param {Workout} workout
 * @param {WorkoutExercise[]} orderedExercises
 * @returns {Promise<Workout>}
 */
export async function reorderExercises(workout, orderedExercises) { ... }
```

### Set Mutations

```js
/**
 * Add a new set to a WorkoutExercise
 * (Copies weight/reps/duration from previous set if it exists)
 * @param {Workout} workout
 * @param {string} workoutExerciseId
 * @returns {Promise<Workout>}
 */
export async function addSetTo(workout, workoutExerciseId) { ... }

/**
 * Update a set with new data
 * @param {Workout} workout
 * @param {string} setId
 * @param {{ weight?: number, reps?: number, duration?: number, speed?: number, incline?: number, resistance?: number }} patch
 * @returns {Promise<Workout>}
 */
export async function updateSet(workout, setId, patch) { ... }

/**
 * Toggle a set's completion status
 * @param {Workout} workout
 * @param {string} setId
 * @returns {Promise<Workout>}
 */
export async function toggleSetCompleted(workout, setId) { ... }

/**
 * Delete a specific set
 * @param {Workout} workout
 * @param {string} workoutExerciseId
 * @param {string} setId
 * @returns {Promise<Workout>}
 */
export async function deleteSet(workout, workoutExerciseId, setId) { ... }
```

### Template-Workout Operations

```js
/**
 * Create a workout from a template
 * (materializes TemplateSetGroups into ExerciseSets with pre-filled data)
 * @param {Template} template
 * @returns {Promise<Workout>}
 */
export async function startWorkoutFromTemplate(template) { ... }

/**
 * Convert a completed workout into a Template
 * (groups consecutive sets with identical reps/weight/duration)
 * @param {Workout} workout
 * @param {string} name
 * @returns {Promise<Template>}
 */
export async function convertWorkoutToTemplate(workout, name) { ... }

/**
 * Update a template from a workout's current sets
 * (syncs the source template matched by templateId)
 * @param {Workout} workout
 * @returns {Promise<Template>}
 */
export async function updateTemplateFromWorkout(workout) { ... }
```

### Database Operations

```js
/**
 * Reset database with optional backup
 * (backs up to localStorage under pump-backup-<ISO> if backupExisting=true)
 * @param {{ backupExisting?: boolean }} options
 * @returns {Promise<void>}
 */
export async function resetDatabase(options) { ... }
```

---

## Seed Data (Phase 0)

**File:** `src/core/seed.js`

```js
/**
 * Seed initial data if database is empty
 * - Creates 47 exercises across all body parts and measurement types
 * - Creates 8 pre-built templates with fully-populated setGroups
 * Idempotent: safe to call multiple times
 * @returns {Promise<void>}
 */
export async function seedIfNeeded() { ... }
```

---

## IndexedDB Schema (Phase 0)

**File:** `src/core/schema.js`

```js
export const DB_NAME = 'pump'
export const DB_VERSION = 2  // Bumped in Phase 0

/**
 * Open (or create) IndexedDB
 * - DB_VERSION 1→2 migration: backs up V1 data to localStorage, clears stores, recreates schema
 * @returns {Promise<IDBDatabase>}
 */
export function openDb() { ... }
```

Object stores:
- `workouts` (keyPath: 'id')
  - Index: startedAt
  - Index: completedAt
- `exercises` (keyPath: 'id')
  - Index: name
  - Index: type (changed from 'category' in V2)
- `templates` (keyPath: 'id')
  - Index: order

---

## Router (Foundation — Phase 0)

**File:** `src/core/router.js`

```js
/**
 * Navigate to a route
 * @param {string} path - e.g. '/', '/history', '/workout/:id', '/history/:id'
 */
export function navigate(path) { ... }

/**
 * Get current route with parsed params
 * @returns {{ path: string, params: Object }}
 */
export function currentRoute() { ... }

/**
 * Register route change handler
 * @param {Function} handler
 */
export function onRouteChange(handler) { ... }
```

Supported routes (Phase 2 adds parametric ones):
- `#/` → Home
- `#/history` → History list
- `#/stats` → Stats
- `#/exercises` → Exercises library

---

## Design Tokens (Phase 0)

**File:** `src/design/tokens.css`

All values from Phase 0 (to be augmented by Phase 1H):
```css
--color-bg: #ffffff;
--color-fg: #000000;
--color-border: #000000;
--color-muted: #666666;

--font-mono: ui-monospace, "SF Mono", Menlo, monospace;

--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-xxl: 48px;

--border-width: 2px;
--radius: 0;
--touch-target: 44px;
```

---

## V1 Types (Superseded in V2)

These types no longer exist. Agents must NOT reference them.

- ❌ `ExerciseCategory` ('push'|'pull'|'legs'|'core'|'cardio')
- ❌ `ExerciseType` ('strength'|'cardio') — replaced by `MeasureBy`
- ❌ `Template.exerciseNames: string[]` — replaced by `Template.templateExercises: TemplateExercise[]`
- ❌ `WorkoutExercise.exerciseType: ExerciseType` — replaced by `WorkoutExercise.measureBy: MeasureBy`
- ❌ `ExerciseSet` missing `order` field — now has it
- ❌ `Workout` missing `createdAt`, `startedAt: null`, `pausedAt`, `totalPausedDuration`, `hasBeenEdited` — now has all

---

## Phase Ownership

### Phase 0 (Core Foundation)
- `src/core/models.js`
- `src/core/schema.js`
- `src/core/store.js`
- `src/core/seed.js`
- `AGENT_CONTRACTS.md` (this file)

### Phase 1A — Home + Template Card Stack
- `src/features/home/home.js`
- `src/features/home/home.css`
- `src/features/home/daily-tips.js` (new)
- `src/features/home/card-stack.js` (new)
- `src/features/home/card-stack.css` (new)

### Phase 1B — Active Workout
- `src/features/active-workout/active-workout.js`
- `src/features/active-workout/active-workout.css`

### Phase 1C — History Detail + Edit
- `src/features/history/history.js`
- `src/features/history/history.css`
- `src/features/workout-detail/workout-detail.js` (new)
- `src/features/workout-detail/workout-detail.css` (new)

### Phase 1D — Stats Rewrite
- `src/features/stats/stats.js`
- `src/features/stats/stats.css`

### Phase 1E — Exercise Picker Multi-select
- `src/features/exercise-picker/exercise-picker.js`
- `src/features/exercise-picker/exercise-picker.css`

### Phase 1F — Exercises Tab Taxonomy
- `src/features/exercises/exercises.js`
- `src/features/exercises/exercises.css`

### Phase 1G — Template Editor + Details + Summary + Countdown
- `src/features/template-editor/template-editor.js`
- `src/features/template-editor/template-editor.css`
- `src/features/template-details/template-details.js` (new)
- `src/features/template-details/template-details.css` (new)
- `src/features/workout-summary/workout-summary.js` (new)
- `src/features/workout-summary/workout-summary.css` (new)
- `src/components/countdown.js` (new)
- `src/components/countdown.css` (new)

### Phase 1H — Design Tokens + Manifest
- `src/design/tokens.css`
- `src/design/base.css`
- `src/design/components.css`
- `manifest.json`
- `index.html` (inline styles only)

### Phase 2 — Integrator
- `service-worker.js`
- Cross-cutting fixes
- Route additions
- Smoke tests

---

## Key Constraints

1. **No external dependencies** — Vanilla JS, ES modules only
2. **IndexedDB only** — localStorage for backups/debugging only
3. **Modular imports** — Each feature is a separate ES module
4. **Hash router** — Works offline in standalone mode
5. **Vanilla CSS** — No CSS-in-JS; all styles in .css files
6. **JSDoc types only** — models.js has no runtime code
7. **ISO 8601 dates** — All dates in storage are ISO strings
8. **Touch-first** — All buttons/inputs min 44px height
9. **Do NOT bump CACHE_VERSION** — Phase 2 does that
10. **Do NOT edit other agents' files** — Absolute file ownership

---

## Testing Phase 0

To verify Phase 0 delivery:

1. Fresh IndexedDB load → 47 exercises with correct type/measureBy, 8 templates with setGroups
2. `startWorkoutFromTemplate(pushDay)` → workout where Bench Press exercise has 4 sets of { reps: 8, weight: 155 }
3. All store.js functions importable and syntactically correct
4. `seedIfNeeded()` is idempotent — running twice does nothing on second call
5. AGENT_CONTRACTS.md documents all new types and functions

---

## Git & Commits

After Phase 0 completes:
1. Append a one-line entry to `PARITY_PLAN.md` under "## 4. CHANGELOG"
2. Example: `- Phase 0 (2026-04-18): Rewrote models, schema, store, seed; DB version 2; 47 exercises; 8 templates with setGroups`
3. Do not bump `CACHE_VERSION` — Phase 2 handles that
