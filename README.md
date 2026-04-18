# Pump

Personal workout logger as a Progressive Web App. Replaces the archived SwiftUI `WorkoutApp` with a modern PWA that works offline and auto-updates without app store friction.

## Architecture

```
src/
├── core/                    # Shared utilities
│   ├── schema.js           # IndexedDB database definition
│   ├── store.js            # Data CRUD operations
│   ├── seed.js             # Initial exercise library & templates
│   ├── router.js           # Hash-based navigation
│   ├── format.js           # Display formatting utilities
│   └── models.js           # TypeScript-style JSDoc type definitions
├── components/             # Reusable UI components
│   ├── button.js           # Brutalist button renderer
│   ├── card.js             # Card component with optional shadow
│   └── textfield.js        # Text input field
├── design/                 # Design system
│   ├── tokens.css          # Color, spacing, typography tokens
│   ├── base.css            # Reset and base styles
│   └── components.css      # Component styles
├── features/               # Page-level features (mutually exclusive routes)
│   ├── home/               # Dashboard with active workout & templates
│   ├── active-workout/     # Live set logger with timer
│   ├── history/            # Past workouts grouped by date
│   └── exercise-picker/    # Modal for selecting exercises
└── main.js                 # App entry point, boot sequence, router wiring
```

No build step. No framework. Pure vanilla ES modules with IndexedDB.

## Features

- **Home**: Dashboard showing active workout or quick-start options
- **Active Workout**: Real-time set tracking with live timer
- **History**: Date-grouped past workouts with stats and delete
- **Exercise Picker**: Searchable exercise library with custom exercise creation

## Run locally

Service workers require HTTPS or `localhost`. From this folder:

```bash
python3 -m http.server 5173
# then open http://localhost:5173
```

Or with Node:

```bash
npx serve .
```

## Deploy

Any of these work with zero config. Pick one and push:

### Vercel (recommended, fastest)

1. `cd` into this folder and `git init && git add . && git commit -m "initial spike"`
2. Create an empty GitHub repo named `pump-pwa`
3. `git remote add origin git@github.com:<you>/pump-pwa.git && git push -u origin main`
4. Go to vercel.com → Add New Project → import the repo → accept defaults → Deploy
5. You'll get a `pump-pwa-<hash>.vercel.app` URL in ~30 seconds

### Alternatives

- **Netlify**: drag-and-drop the folder at app.netlify.com/drop, or connect the GitHub repo
- **Cloudflare Pages**: connect GitHub repo, build command blank, output directory `.`
- **GitHub Pages**: push to `main`, enable Pages in repo Settings → Pages, source = `main`

## Install on iPhone

1. Open the deployed URL in **Safari** (not Chrome — on iOS, Chrome can't install PWAs)
2. Tap the Share button → **Add to Home Screen**
3. Name it "Pump" and tap Add
4. Launch from home screen — it should open full-screen with no browser chrome

## Update flow (the whole reason we're doing this)

1. Edit code locally
2. Bump `CACHE_VERSION` in `service-worker.js` when you change the shell
3. `git push` → Vercel auto-deploys in ~30s
4. Next time you open the app on your phone, the service worker fetches the new version in the background; the *next* launch after that runs the new code
5. To see the new version immediately: force-quit the app and reopen

No cables. No Xcode. No signing. No expiration.

## Known iOS PWA gotchas

- **Storage eviction**: if you don't open the app for ~7 weeks, iOS may clear IndexedDB. Export to CSV/JSON is on the roadmap as an escape hatch.
- **No push notifications** unless on iOS 16.4+ *and* installed to home screen. Not relevant for a workout logger.
- **No HealthKit / Apple Watch integration** — this is the real tradeoff vs. native. If you later want Watch support, you'd go back to Swift or look at cross-platform native.
