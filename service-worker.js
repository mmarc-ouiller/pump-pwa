// Minimal service worker: precache the shell, serve cache-first, update on new deploys.
// Bump CACHE_VERSION to force clients to fetch the new shell.

const CACHE_VERSION = 'pump-v4';
const CACHE_NAME = CACHE_VERSION;

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-32.png',
  './icon-192.png',
  './icon-512.png',
  './src/main.js',
  './src/core/schema.js',
  './src/core/models.js',
  './src/core/store.js',
  './src/core/seed.js',
  './src/core/router.js',
  './src/core/format.js',
  './src/design/tokens.css',
  './src/design/base.css',
  './src/design/components.css',
  './src/components/button.js',
  './src/components/card.js',
  './src/components/textfield.js',
  './src/components/countdown.js',
  './src/components/countdown.css',
  './src/features/home/home.js',
  './src/features/home/home.css',
  './src/features/home/card-stack.js',
  './src/features/home/card-stack.css',
  './src/features/home/daily-tips.js',
  './src/features/active-workout/active-workout.js',
  './src/features/active-workout/active-workout.css',
  './src/features/history/history.js',
  './src/features/history/history.css',
  './src/features/workout-detail/workout-detail.js',
  './src/features/workout-detail/workout-detail.css',
  './src/features/exercise-picker/exercise-picker.js',
  './src/features/exercise-picker/exercise-picker.css',
  './src/features/stats/stats.js',
  './src/features/stats/stats.css',
  './src/features/exercises/exercises.js',
  './src/features/exercises/exercises.css',
  './src/features/template-editor/template-editor.js',
  './src/features/template-editor/template-editor.css',
  './src/features/template-details/template-details.js',
  './src/features/template-details/template-details.css',
  './src/features/workout-summary/workout-summary.js',
  './src/features/workout-summary/workout-summary.css',
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("pump-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // For navigation requests, try network first so fresh deploys land quickly,
  // fall back to cache when offline at the gym.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Everything else: cache-first, fall back to network, cache the result.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});
