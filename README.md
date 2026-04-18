# Pump

Personal workout logger as a Progressive Web App. Replaces the SwiftUI
`WorkoutApp` that was getting reinstalled weekly due to Apple free-provisioning
expiry.

## What this scaffold is

A deliberately tiny PWA spike — no build step, no framework, no backend. The
point is to validate that the "Add to Home Screen → looks like a native app →
works offline → auto-updates on redeploy" experience meets your bar before
porting feature parity from the SwiftUI app.

Files:

- `index.html` — entry point with the logging form and history list
- `styles.css` — dark theme, iOS safe-area aware
- `app.js` — IndexedDB wiring, form handler, service-worker registration, "spike checks" indicators
- `manifest.json` — PWA metadata (name, icons, standalone display)
- `service-worker.js` — offline shell cache with network-first navigation
- `icon-32.png`, `icon-192.png`, `icon-512.png` — placeholder icons (replace when you have a real design)

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

On the home-screen-launched app, check the "Spike checks" section — all four should say `yes`:

- Loaded from manifest
- Service worker active
- IndexedDB available
- Running standalone

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

## Next steps (after the spike)

Port feature parity from `/sessions/beautiful-elegant-bell/mnt/WorkoutApp/`:

- [ ] `ActiveWorkout` — the live set-logging flow (more sophisticated than this spike's single-set form)
- [ ] `ExercisePicker` — searchable exercise library
- [ ] `History` — date-grouped past workouts, per-exercise progression view
- [ ] `Home` — dashboard / entry point
- [ ] Replace placeholder icons with a real design
- [ ] Add CSV export for data portability
