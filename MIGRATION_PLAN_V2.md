# Pump PWA — V2 Feature Parity Plan

Port the planned Desktop SwiftUI features (from `.claude/ralph-prompts/`) into the PWA, fix mobile layout, and reach full parity with where the Swift app was heading.

Designed for **parallel sub-agents**, same rules as V1.

---

## Ground rules (same as V1 — every agent must read)

1. **Stack is locked.** Vanilla JS + ES modules. No build step, no framework, no TypeScript, no npm deps.
2. **Don't break existing features.** Home, History, ActiveWorkout, ExercisePicker all work — don't regress them.
3. **Brutalist aesthetic** — monospaced, white/black, 2px borders, zero radius, 8pt grid, uppercase labels.
4. **File ownership is exclusive** per task. No agent touches another agent's files.
5. **Bump `CACHE_VERSION`** in `service-worker.js` whenever the file list changes (Phase 2 Integrator only).
6. **Storage is local-only** — IndexedDB, no backend.
7. **Read `AGENT_CONTRACTS.md`** before writing any code.

---

## What's changing vs V1

| Area | V1 State | V2 Target |
|---|---|---|
| Tab bar | HOME, HISTORY | HOME, HISTORY, STATS, EXERCISES |
| Cardio inputs | Duration only | Duration + Speed + Incline + Resistance |
| Templates | Read-only (start from template) | Full CRUD editor (create, edit, delete, reorder) |
| Stats | None | Weight progression + Volume trends + Streak counter |
| Exercise Bank | Modal picker only | Dedicated tab: browse, create, edit, delete custom |
| Mobile layout | Broken safe-area / scroll | Fixed: proper viewport, safe-area insets, scroll |

---

## Target directory additions

```
src/
├── features/
│   ├── stats/
│   │   ├── stats.js          # Phase 1B: Stats feature
│   │   └── stats.css
│   ├── exercises/
│   │   ├── exercises.js      # Phase 1B: Exercise Bank tab
│   │   └── exercises.css
│   └── template-editor/
│       ├── template-editor.js   # Phase 1B: Template editor modal
│       └── template-editor.css
```

Plus edits to:
- `index.html` — 4-tab bar, mobile layout fixes
- `src/main.js` — new routes wired
- `src/core/store.js` — new CRUD methods for templates + custom exercises
- `src/features/active-workout/active-workout.js` — full cardio inputs
- `service-worker.js` — updated cache list

---

## Dependency graph

```
          ┌──────────────────────────────────────┐
          │  Phase 0: Mobile Fix + Store Expansion│
          │         (1 agent, serial)             │
          └──────────────────┬───────────────────┘
                             │
        ┌────────────────────┼──────────────────────┐
        ▼                    ▼                      ▼
  ┌──────────┐        ┌──────────────┐       ┌──────────────┐
  │Phase 1A  │        │  Phase 1B    │       │  Phase 1B    │
  │  Stats   │        │  Exercises   │       │  Template    │
  │  Feature │        │  Bank Tab    │       │  Editor      │
  └──────────┘        └──────────────┘       └──────────────┘
        └────────────────────┼──────────────────────┘
                             ▼
              ┌──────────────────────────┐
              │  Phase 1C: Cardio Inputs │
              │  (1 agent, can parallel) │
              └──────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  Phase 2: Integrator     │
              │  (1 agent, serial)       │
              └──────────────────────────┘
```

---

# Phase 0 — Mobile Fix + Store Expansion (1 agent, serial)

**Blocks:** everything.

**Files owned (exclusive):**
- `index.html`
- `src/main.js`
- `src/design/base.css`
- `src/core/store.js` (add new methods only — do not break existing ones)

### Mobile layout fixes

**Problem:** Content hidden under tab bar / notch, scrolling broken on iOS Safari.

Fix `index.html`:
```html
<!-- 4-tab bar: HOME, HISTORY, STATS, EXERCISES -->
<nav id="tabbar">
  <button class="tab" data-route="/" aria-current="page">HOME</button>
  <button class="tab" data-route="/history">HISTORY</button>
  <button class="tab" data-route="/stats">STATS</button>
  <button class="tab" data-route="/exercises">EXERCISES</button>
</nav>
```

Update the tab bar CSS grid to `1fr 1fr 1fr 1fr` (4 columns).

Fix `src/design/base.css`:
```css
html, body {
  height: 100%;
  overflow: hidden; /* prevent body scroll — let #app scroll */
}

body {
  display: flex;
  flex-direction: column;
  /* Safe area top only on body — bottom handled by #app padding */
  padding-top: env(safe-area-inset-top);
}

#app {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* Bottom padding = tab bar height (56px) + safe area bottom */
  padding-bottom: calc(56px + env(safe-area-inset-bottom));
}
```

Fix the tab bar inline CSS in `index.html`:
```css
#tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  background: var(--color-bg);
  border-top: var(--border-width) solid var(--color-border);
  /* Height = touch target + safe area */
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
}

#tabbar .tab {
  height: 56px; /* fixed, not var(--touch-target) — prevents squishing */
  font-family: var(--font-mono);
  font-size: 0.7rem; /* smaller for 4 tabs */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: transparent;
  border: none;
  border-right: var(--border-width) solid var(--color-border);
  cursor: pointer;
  color: var(--color-muted);
}

#tabbar .tab:last-child { border-right: none; }

#tabbar .tab[aria-current="page"] {
  background: var(--color-fg);
  color: var(--color-bg);
}
```

### `src/main.js` updates

Add routes for `/stats` and `/exercises`:
```js
import { renderStats } from './features/stats/stats.js';
import { renderExercises } from './features/exercises/exercises.js';

// In renderRoute():
} else if (route.path === '/stats') {
  renderStats(appEl);
} else if (route.path === '/exercises') {
  renderExercises(appEl);
}

// In updateTabBar():
// Update logic to handle 4 tabs correctly
```

### `src/core/store.js` additions

Add these new async functions (do NOT modify existing ones):

```js
// Template CRUD (for template editor)
export async function createTemplate({ name, exerciseNames, order })
export async function updateTemplate(template)   // full overwrite via put()
export async function deleteTemplate(template)   // remove from IDB

// Custom exercise management
export async function updateExercise(exercise)   // full overwrite via put()
export async function deleteExercise(exercise)   // remove from IDB

// Stats queries
export async function fetchAllWorkouts()         // all workouts (completed + active), sorted by startedAt desc
```

**Definition of done:** App loads on mobile Safari with correct tab bar, content scrolls properly, nothing hidden under notch or home bar. Four tabs visible. `/stats` and `/exercises` routes render an empty placeholder ("COMING SOON"). No console errors.

---

# Phase 1A — Stats Feature (1 agent, parallel after Phase 0)

**Files owned (exclusive):** `src/features/stats/stats.js`, `src/features/stats/stats.css`

**Source spec:** `.claude/ralph-prompts/02-stats-dashboard.md`

**What to implement:**

### Data aggregations (compute from `fetchAllWorkouts()`)

1. **Weight Progression** — For each unique exercise name that appears in completed workouts, find the max weight logged per week. Render as a simple bar chart per exercise (top 5 most-used exercises).

2. **Volume Trends** — Total volume (sum of weight × reps for all completed sets) grouped by week. Render as a bar chart with week labels on the X axis.

3. **Consistency Streak** — Count consecutive days with at least one completed workout. Show current streak + longest streak.

### Brutalist chart style (no libraries — build from DOM/CSS)

```
Bar chart: a flex row of divs, each div's height proportional to its value.
Bars are solid black rectangles. No curves, no gradients.
X-axis labels: monospace, uppercase, tiny.
Y-axis: optional, just the max value label.
```

```css
.stats__bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
  border-bottom: 2px solid #000;
  border-left: 2px solid #000;
  padding: 8px 4px 0;
}
.stats__bar {
  flex: 1;
  background: var(--color-fg);
  min-width: 8px;
}
.stats__bar-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  font-family: var(--font-mono);
  text-align: center;
}
```

### Layout

```
[STATS header]
─────────────────
[STREAK]
  CURRENT STREAK: 5 DAYS
  BEST STREAK: 12 DAYS
─────────────────
[VOLUME THIS MONTH]
  [bar chart]
─────────────────
[WEIGHT PROGRESSION]
  [exercise selector chips]
  [bar chart for selected exercise]
```

**Export:** `renderStats(appEl)`

**Definition of done:** Stats tab shows real data computed from IndexedDB. Charts render as black bars. Streak counter shows correct current streak. Works with 0 workouts (shows "NO DATA YET" empty states per section).

---

# Phase 1B — Exercise Bank Tab (1 agent, parallel after Phase 0)

**Files owned (exclusive):** `src/features/exercises/exercises.js`, `src/features/exercises/exercises.css`

**What to implement:** A dedicated full-screen tab for browsing and managing the exercise library.

### Sections

1. **Header:** "EXERCISES" title + "+ NEW" button (same create flow as ExercisePicker's create form — can import `openExercisePicker` or duplicate the create form inline).

2. **Category filter chips** — same as ExercisePicker: ALL, PUSH, PULL, LEGS, CORE, CARDIO.

3. **Search input** — debounced, case-insensitive.

4. **Exercise list** grouped by category (when ALL selected) or flat list (when category selected):
   - Each row: exercise name + type tag (STRENGTH/CARDIO) + optional CUSTOM tag.
   - Custom exercises get an **edit (pencil icon or "EDIT" text)** and **delete (×)** button.
   - Seed library exercises are read-only (no edit/delete).

5. **Edit flow** (custom exercises only): tap EDIT → inline edit or a small modal — update name/category/type → save via `updateExercise()`.

6. **Delete flow:** confirm dialog → `deleteExercise()` → re-render.

**Export:** `renderExercises(appEl)`

**Definition of done:** EXERCISES tab shows full library. Custom exercises can be edited and deleted. Seed exercises are read-only. Category filter and search work.

---

# Phase 1C — Template Editor (1 agent, parallel after Phase 0)

**Files owned (exclusive):** `src/features/template-editor/template-editor.js`, `src/features/template-editor/template-editor.css`

**Source spec:** `.claude/ralph-prompts/04-template-editor.md`

**What to implement:** A modal (like ExercisePicker) for creating and editing templates. Access it from the Home screen's template cards.

### API

```js
export function openTemplateEditor({ template = null, onSave })
// template = null → create mode
// template = existing Template → edit mode
export function closeTemplateEditor()
```

### Editor UI

- **Header:** "NEW TEMPLATE" or "EDIT TEMPLATE" + × close button
- **Name field:** text input, placeholder "TEMPLATE NAME"
- **Exercise list:** ordered list of exercise names already in the template
  - Each row: exercise name + × remove button
  - Up/down ▲▼ buttons to reorder (or drag-to-reorder if easy, otherwise ▲▼ is fine)
- **"+ ADD EXERCISE" button:** calls `openExercisePicker({ onSelect })` to add an exercise name to the list
- **"SAVE" solid button:** calls `createTemplate()` or `updateTemplate()` depending on mode, then calls `onSave(template)` + closes
- **"DELETE" outline button** (edit mode only): confirm dialog → `deleteTemplate()` → closes + calls `onSave(null)`

### Home screen integration

Edit `src/features/home/home.js` to add an EDIT button to each template card:

```js
import { openTemplateEditor } from '../template-editor/template-editor.js';

// In buildTemplateCard():
const editBtn = renderButton({
  title: 'EDIT',
  variant: 'outline',
  onClick: () => openTemplateEditor({
    template,
    onSave: () => renderHome(appEl) // re-render home after save
  })
});

// Also add a "+ NEW TEMPLATE" button at the bottom of the templates section
```

Also add `createTemplate`, `updateTemplate`, `deleteTemplate` to the home's imports (these come from store.js Phase 0 additions).

**Definition of done:** Can create a new template from Home. Can edit name and exercise list of existing templates. Can delete a template. Home re-renders after save. Changes persist across reloads.

---

# Phase 1D — Cardio Inputs (1 agent, parallel after Phase 0)

**Files owned (exclusive):** `src/features/active-workout/active-workout.js`, `src/features/active-workout/active-workout.css`

**Source spec:** `.claude/ralph-prompts/03-cardio-inputs.md`

**What to change:** The current cardio set row only has a Duration input. Expand it to show all four fields horizontally.

### CardioSetRow inputs

```
SET  |  DURATION  |  SPEED   |  INCLINE  |  RESISTANCE  | ✓
 1   |  [__ MIN]  |  [__ MPH]|  [__ %]   |  [__ LVL]    | ○
```

All inputs:
- `inputmode="decimal"` for decimal values
- Placeholder text: `MIN`, `MPH`, `%`, `LVL`
- 250ms debounce before calling `updateSet(workout, set.id, { duration, speed, incline, resistance })`
- Min width: enough to fit 3-4 chars + placeholder

Update column headers for cardio:
```
SET | DURATION | SPEED | INCLINE | RESISTANCE | (check)
```

Update the `.active-workout__col-headers` and `.active-workout__set-row` grid layout to accommodate the extra columns when `isCardio` is true. Use a data attribute or modifier class:
```css
.active-workout__set-row--cardio {
  grid-template-columns: 24px 1fr 1fr 1fr 1fr 40px;
}
.active-workout__set-row--strength {
  grid-template-columns: 24px 1fr 1fr 40px;
}
```

**Definition of done:** Cardio exercises show all 4 input fields. Values persist when marking set complete and when reloading mid-workout.

---

# Phase 2 — Integrator (1 agent, serial, after all Phase 1 agents)

**Files owned:** `service-worker.js`, cross-cutting fixes.

### Checklist

1. **Update `service-worker.js`:**
   - Bump `CACHE_VERSION` to `pump-v3`
   - Add new files to cache list:
     - `src/features/stats/stats.js`, `stats.css`
     - `src/features/exercises/exercises.js`, `exercises.css`
     - `src/features/template-editor/template-editor.js`, `template-editor.css`

2. **Wire template editor into home.js:**
   - Verify the EDIT button and "+ NEW TEMPLATE" button were added by Phase 1C agent.
   - If not, add them now.

3. **Tab bar aria-current:**
   - Ensure `updateTabBar()` in `main.js` correctly handles `/stats` and `/exercises` routes.

4. **Verify mobile layout:**
   - Start local server, load on phone or in mobile emulator.
   - Content should not be hidden under tab bar or notch.
   - All 4 tabs should be tappable.

5. **Cross-feature smoke test:**
   - Home → Start workout → log cardio sets (all 4 fields visible) → Finish → History shows it → Stats tab shows updated volume → Exercises tab shows library.
   - Create new template → appears on Home → Edit it → Delete it.

6. **Update `AGENT_CONTRACTS.md`:**
   - Add `createTemplate`, `updateTemplate`, `deleteTemplate`, `updateExercise`, `deleteExercise`, `fetchAllWorkouts` to the Store API section.
   - Add `openTemplateEditor` / `closeTemplateEditor` API.
   - Add route entries for `/stats` and `/exercises`.

**Definition of done:** All 4 tabs work. Cardio inputs have all fields. Template editor opens from Home. Stats show real data. Mobile layout is correct on iPhone Safari. Push to main.

---

## Parallelism summary

| Wave | Agents | Parallel? | Blocks on |
|---|---|---|---|
| 0 | Mobile Fix + Store Expansion | no (solo) | — |
| 1A | Stats | yes | Phase 0 |
| 1B | Exercise Bank | yes | Phase 0 |
| 1C | Template Editor | yes | Phase 0 |
| 1D | Cardio Inputs | yes | Phase 0 |
| 2 | Integrator | no (solo) | Phase 1 (all) |

Maximum concurrency: 4 agents (Phase 1A–1D in parallel).

---

## What can go wrong

- **Template editor imports from home.js.** Phase 1C adds an import to `home.js` — that's the only cross-file edit allowed. Integrator double-checks this landed.
- **Stats with zero data.** Each stats section must handle empty state gracefully — no crashes on `undefined` or empty arrays.
- **Cardio column layout overflow on narrow phones.** 5 columns + check button is tight on 375px screens. The CSS grid widths need to use `minmax` or scale inputs small. Test on 375px.
- **`fetchAllWorkouts` hitting performance on large datasets.** Accepted risk for now — no pagination needed at this scale.
