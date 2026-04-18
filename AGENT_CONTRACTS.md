# Pump PWA Agent Contracts

This document defines the contracts between agents in the Pump PWA migration. All Phase 1A/1B agents MUST implement against these specs without deviating or reading other agents' code.

---

## Data Models

All models are defined in `src/core/models.js` as JSDoc typedefs. These are the source of truth.

### ExerciseCategory
```ts
type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core' | 'cardio'
```

### ExerciseType
```ts
type ExerciseType = 'strength' | 'cardio'
```

### Exercise
```ts
interface Exercise {
  id: string                      // UUID
  name: string                    // e.g. "Bench Press"
  category: ExerciseCategory
  type: ExerciseType
  isCustom: boolean               // true if user-created
}
```

### ExerciseSet
```ts
interface ExerciseSet {
  id: string                      // UUID
  weight: number | null           // pounds (strength)
  reps: number | null             // reps (strength)
  duration: number | null         // seconds (cardio)
  speed: number | null            // mph (cardio)
  incline: number | null          // percent (cardio)
  resistance: number | null       // level (cardio)
  isCompleted: boolean
}
```

### WorkoutExercise
```ts
interface WorkoutExercise {
  id: string                      // UUID
  exerciseId: string              // Reference to Exercise.id
  exerciseName: string            // Cached name for display
  exerciseType: ExerciseType      // Cached type (strength|cardio)
  sets: ExerciseSet[]
}
```

### Workout
```ts
interface Workout {
  id: string                      // UUID
  name: string
  templateId: string | null       // Reference to Template.id
  startedAt: string               // ISO 8601 timestamp
  completedAt: string | null      // ISO 8601 timestamp (null if active)
  exercises: WorkoutExercise[]
}
```

### Template
```ts
interface Template {
  id: string                      // UUID
  name: string
  order: number                   // Display order (0, 1, 2, ...)
  exerciseNames: string[]         // Array of exercise names (not IDs)
}
```

---

## Data Store API (Phase 1A.1)

**File:** `src/core/store.js`

All functions are async. All return objects matching the models above. All errors should be logged but not thrown (graceful degradation).

### Exercises

```js
/**
 * Fetch all exercises, optionally filtered by category
 * @param {ExerciseCategory} [category] - If provided, filter to this category
 * @returns {Promise<Exercise[]>}
 */
export async function fetchExercises(category) { ... }

/**
 * Create a new custom exercise
 * @param {{ name: string, category: ExerciseCategory, type: ExerciseType }} data
 * @returns {Promise<Exercise>}
 */
export async function createExercise(data) { ... }
```

### Templates

```js
/**
 * Fetch all templates
 * @returns {Promise<Template[]>}
 */
export async function fetchTemplates() { ... }
```

### Workouts

```js
/**
 * Fetch the active workout (completedAt === null)
 * @returns {Promise<Workout | null>}
 */
export async function fetchActiveWorkout() { ... }

/**
 * Fetch all completed workouts, sorted by startedAt descending
 * @returns {Promise<Workout[]>}
 */
export async function fetchCompletedWorkouts() { ... }

/**
 * Create a new workout
 * @param {{ name: string, templateId?: string }} data
 * @returns {Promise<Workout>}
 */
export async function createWorkout(data) { ... }

/**
 * Create a new workout from a template
 * @param {Template} template
 * @returns {Promise<Workout>}
 */
export async function startWorkoutFromTemplate(template) { ... }

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
 * Save a workout (after local edits)
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function saveWorkout(workout) { ... }
```

### Workout Editing

```js
/**
 * Add a new empty set to a WorkoutExercise
 * @param {Workout} workout
 * @param {string} workoutExerciseId - The ID of the WorkoutExercise
 * @returns {Promise<Workout>}
 */
export async function addSetTo(workout, workoutExerciseId) { ... }

/**
 * Update a set with new data
 * @param {Workout} workout
 * @param {string} setId
 * @param {{ weight?: number, reps?: number, duration?: number, speed?: number, incline?: number, resistance?: number }} changes
 * @returns {Promise<Workout>}
 */
export async function updateSet(workout, setId, changes) { ... }

/**
 * Toggle a set's completion status
 * @param {Workout} workout
 * @param {string} setId
 * @returns {Promise<Workout>}
 */
export async function toggleSetCompleted(workout, setId) { ... }

/**
 * Add an exercise to an active workout
 * @param {Workout} workout
 * @param {Exercise} exercise
 * @returns {Promise<Workout>}
 */
export async function addExerciseToWorkout(workout, exercise) { ... }

/**
 * Remove an exercise from an active workout
 * @param {Workout} workout
 * @param {string} workoutExerciseId
 * @returns {Promise<Workout>}
 */
export async function removeExerciseFromWorkout(workout, workoutExerciseId) { ... }
```

---

## Seed Data (Phase 1A.2)

**File:** `src/core/seed.js`

```js
/**
 * Seed initial data if database is empty
 * @returns {Promise<void>}
 */
export async function seedIfNeeded() { ... }
```

Seeds MUST include:
- ~15-20 built-in exercises across all categories (push, pull, legs, core, cardio)
- ~3-4 pre-built templates (e.g., "Push Day", "Pull Day", "Leg Day", "Cardio")

See `WorkoutApp/Core/Services/ExerciseLibrary.swift` for the canonical list.

---

## Design Components (Phase 1A.3)

**File:** `src/components/*.js`

All components must use CSS class names following the BEM-ish pattern with feature prefix. Examples:
- `.home__header`, `.home__card`, `.home__card--active`
- `.active-workout__exercise`, `.active-workout__set-row`

### Button

```js
/**
 * Render a button
 * @param {{ title: string, variant?: 'solid'|'outline', onClick?: Function, disabled?: boolean }} options
 * @returns {HTMLButtonElement}
 */
export function renderButton(options) { ... }
```

Styles:
- `variant='solid'` (default): black background, white text, 2px black border
- `variant='outline'`: transparent background, black text, 2px black border
- Both use monospace font, uppercase text, min 44px height
- No border-radius (sharp corners)

### Card

```js
/**
 * Render a card
 * @param {{ children?: HTMLElement[], shadow?: boolean }} options
 * @returns {HTMLDivElement}
 */
export function renderCard(options) { ... }
```

Styles:
- 2px black border
- Padding: 16px (--space-md)
- No border-radius
- Optional shadow parameter adds 4px black border on right/bottom edges for brutalist effect

### TextField

```js
/**
 * Render a text input field
 * @param {{ placeholder?: string, value?: string, type?: string, inputMode?: string, onInput?: Function }} options
 * @returns {HTMLInputElement}
 */
export function renderTextField(options) { ... }
```

Styles:
- 2px black border
- Monospace font
- Padding: 8px (--space-sm)
- Focus: 4px black outline
- Min 44px height

All components MUST be added to `src/design/components.css` with proper class definitions.

---

## Router (Phase 0 — Foundation)

**File:** `src/core/router.js`

```js
/**
 * Navigate to a route
 * @param {string} path - e.g. '/', '/history', '/workout/abc123', '/picker'
 */
export function navigate(path) { ... }

/**
 * Get the current route with parsed params
 * @returns {{ path: string, params: Object }}
 * e.g. { path: '/workout/:id', params: { id: 'abc123' } }
 */
export function currentRoute() { ... }

/**
 * Register a handler for route changes
 * @param {Function} handler - Called with currentRoute() result on each hashchange
 */
export function onRouteChange(handler) { ... }
```

Routes:
- `#/` → `{ path: '/', params: {} }`
- `#/history` → `{ path: '/history', params: {} }`
- `#/workout/abc123` → `{ path: '/workout/:id', params: { id: 'abc123' } }`
- `#/picker` → `{ path: '/picker', params: {} }`

---

## Format Utilities (Phase 0 — Foundation)

**File:** `src/core/format.js`

```js
/**
 * Format duration in seconds
 * @param {number} seconds
 * @returns {string} e.g. "45 MIN" or "1H 23M"
 */
export function formatDuration(seconds) { ... }

/**
 * Format a strength set
 * @param {{ weight: number|null, reps: number|null }} set
 * @returns {string} e.g. "135 × 8"
 */
export function formatStrengthSet({ weight, reps }) { ... }

/**
 * Format a cardio set
 * @param {{ duration: number|null, speed: number|null, incline: number|null, resistance: number|null }} set
 * @returns {string} e.g. "30 min · 6.5 mph · 2% incline"
 */
export function formatCardioSet({ duration, speed, incline, resistance }) { ... }

/**
 * Format today's date in HomeView style
 * @returns {string} e.g. "SATURDAY, APR 18"
 */
export function formatCurrentDate() { ... }
```

---

## Feature Render Functions (Phase 1B)

All feature renderers are imported in `src/main.js` and called when the route changes. Each clears the `#app` container and re-renders.

### Home (Phase 1B.1)

**File:** `src/features/home/home.js`

```js
/**
 * Render the Home view
 * @param {HTMLElement} appEl - The #app container
 * @returns {Promise<void>}
 */
export async function renderHome(appEl) { ... }
```

Must display:
1. Header: "WORKOUT" (display font), today's date (caption font, uppercase)
2. If there's an active workout:
   - "IN PROGRESS" label (caption)
   - Card with workout name, duration, "CONTINUE" button
3. If no active workout:
   - "QUICK START" button
4. "TEMPLATES" section (caption)
   - List of template cards, each with name, exercise count, "START" button

Use `.home__*` class names.

### Active Workout (Phase 1B.2)

**File:** `src/features/active-workout/active-workout.js`

```js
/**
 * Render the Active Workout view
 * @param {HTMLElement} appEl
 * @param {{ id: string }} params - params.id is the workout ID
 * @returns {Promise<void>}
 */
export async function renderActiveWorkout(appEl, params) { ... }
```

Must display:
1. Header: workout name, elapsed time, "COMPLETE" button
2. For each exercise:
   - Exercise name, type indicator
   - For each set: weight × reps (or duration format), completion checkbox
   - "ADD SET" button
3. "ADD EXERCISE" button (opens ExercisePicker)

Use `.active-workout__*` class names.

### History (Phase 1B.3)

**File:** `src/features/history/history.js`

```js
/**
 * Render the History view
 * @param {HTMLElement} appEl
 * @returns {Promise<void>}
 */
export async function renderHistory(appEl) { ... }
```

Must display:
1. List of completed workouts (reversed chronological)
2. For each: name, date, duration, exercise count + set count summary
3. Clickable to view details or delete

Use `.history__*` class names.

### Exercise Picker (Phase 1B.4)

**File:** `src/features/exercise-picker/exercise-picker.js`

Imperative API (modal-based):

```js
/**
 * Open the exercise picker modal
 * @param {{ onSelect: (exercise: Exercise) => void }} options
 * @returns {void}
 */
export function openExercisePicker(options) { ... }

/**
 * Close the exercise picker modal
 * @returns {void}
 */
export function closeExercisePicker() { ... }
```

Must:
1. Use `document.getElementById('modal')` to render into the shared `<dialog>`
2. Display exercises organized by category (tabs or collapsible)
3. Each exercise clickable to select and close picker
4. Call `options.onSelect(exercise)` with selected Exercise object

Use `.picker__*` class names.

---

## CSS Custom Properties Reference

All values from `src/design/tokens.css`:

```css
--color-bg: #ffffff;
--color-fg: #000000;
--color-border: #000000;
--color-muted: #666666;

--font-mono: ui-monospace, "SF Mono", Menlo, monospace;

--font-display: 2rem;
--font-heading: 1.25rem;
--font-subheading: 1rem;
--font-body: 0.875rem;
--font-caption: 0.75rem;
--font-data: 1.125rem;

--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-xxl: 48px;

--border-width: 2px;
--border-width-thick: 4px;

--radius: 0;

--touch-target: 44px;

--anim-duration: 150ms;
```

---

## CSS Class Naming Convention

All classes use a BEM-ish pattern with feature prefix:

```
.{feature}__{block}
.{feature}__{block}--{modifier}
.{feature}__{block}__{element}
.{feature}__{block}__{element}--{modifier}
```

Examples:
```
.home__header
.home__card
.home__card--active
.home__button

.active-workout__exercise
.active-workout__exercise--cardio
.active-workout__set-row
.active-workout__set-row--completed

.history__section
.history__card
.history__card--clickable

.picker__chip
.picker__chip--selected
.picker__list
```

---

## Service Worker & Caching

**File:** `service-worker.js` (Do not modify)

Already implemented. Provides:
- Precache of shell files
- Network-first for navigations
- Cache-first for assets with fallback to network

---

## Main.js Orchestration

**File:** `src/main.js` (Phase 0)

Boot sequence:
1. Open IndexedDB
2. Seed initial data if needed
3. Load feature modules (defensive try/catch)
4. Set up tab bar click handlers
5. Register service worker
6. Set up router and render current route

Tab bar navigation:
- HOME button: navigate to '/'
- HISTORY button: navigate to '/history'
- Updates `aria-current="page"` attribute

---

## Phase Responsibilities

### Phase 0 (Foundation Architect) ✅
- [ ] Schema, models, router, format utilities
- [ ] Main.js orchestration
- [ ] index.html and tab bar
- [ ] Design tokens and base CSS
- [ ] Stub files for all other modules
- [ ] This contract document

### Phase 1A.1 (Data Store)
- Implement `src/core/store.js` with IndexedDB operations
- Must honor all function signatures in this contract
- Gracefully handle errors (log, don't throw)

### Phase 1A.2 (Seed Data)
- Implement `src/core/seed.js`
- Seed exercises and templates on first load
- See ExerciseLibrary.swift for canonical list

### Phase 1A.3 (Design Components)
- Implement `src/components/button.js`, `card.js`, `textfield.js`
- Implement `src/design/components.css`
- All styles must use tokens from `tokens.css`

### Phase 1B.1 (Home Feature)
- Implement `src/features/home/home.js` and `home.css`
- Use Data Store API to fetch active workout and templates
- Wire up buttons to navigate

### Phase 1B.2 (Active Workout Feature)
- Implement `src/features/active-workout/active-workout.js` and `active-workout.css`
- Use Data Store API to fetch/update workout and sets
- Wire up ExercisePicker modal

### Phase 1B.3 (History Feature)
- Implement `src/features/history/history.js` and `history.css`
- Use Data Store API to fetch completed workouts
- Display summary data and allow deletion

### Phase 1B.4 (Exercise Picker)
- Implement `src/features/exercise-picker/exercise-picker.js` and `exercise-picker.css`
- Use Data Store API to fetch exercises
- Render into `#modal` dialog

### Phase 2 (Integrator)
- Remove old `app.js` and `styles.css`
- Update `service-worker.js` to cache new module paths
- Verify all features work end-to-end
- Handle any cross-cutting concerns

---

## Key Constraints

1. **No external dependencies** — Vanilla JS only
2. **IndexedDB only** — No localStorage for complex data
3. **Modular imports** — Each feature is a separate ES module
4. **Hash router** — Must work offline in standalone mode
5. **Brutalist design** — No rounded corners, only black/white, 2px borders
6. **Touch-first** — All buttons/inputs min 44px (accessibility)
7. **Monospace typography** — All fonts use `--font-mono`
8. **No CSS-in-JS** — All styles in .css files
9. **JSDoc types only** — models.js has no runtime code
10. **Graceful degradation** — Features load with defensive try/catch

---

---

## V2 Additions

### New Store Functions (added in V2)
- `createTemplate({ name, exerciseNames, order })` → Template
- `updateTemplate(template)` → Template
- `deleteTemplate(template)` → void
- `updateExercise(exercise)` → Exercise
- `deleteExercise(exercise)` → void
- `fetchAllWorkouts()` → Workout[] (all, including active, sorted by startedAt desc)

### New Feature APIs
- `openTemplateEditor({ template?, onSave })` — opens bottom-sheet editor (create or edit mode)
- `closeTemplateEditor()` — closes editor
- `renderStats(appEl)` — renders stats tab
- `renderExercises(appEl)` — renders exercise bank tab

### New Routes
- `#/stats` → renderStats(appEl)
- `#/exercises` → renderExercises(appEl)

### V2 Tab Bar
4 tabs: HOME (`/`), HISTORY (`/history`), STATS (`/stats`), EXERCISES (`/exercises`)

---

## Testing Notes

To test locally:
```bash
cd /sessions/affectionate-practical-pascal/mnt/pump-pwa
python3 -m http.server 5173 &
# Visit http://localhost:5173/
# Check DevTools console for boot messages
# Verify IndexedDB in DevTools > Application > Indexed Databases
```

Service worker can be inspected in DevTools > Application > Service Workers.
