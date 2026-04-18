/**
 * Hash-based router for Pump PWA
 * Routes: #/ (home), #/history, #/workout/:id, #/picker
 */

const ROUTES = {
  '/': 'home',
  '/history': 'history',
  '/workout/:id': 'active-workout',
  '/picker': 'picker',
};

/**
 * Navigate to a route
 * @param {string} path - e.g., '/', '/history', '/workout/abc123'
 */
export function navigate(path) {
  window.location.hash = path;
}

/**
 * Get the current route and parsed params
 * @returns {{ path: string, params: Object }}
 * e.g., { path: '/workout/:id', params: { id: 'abc123' } }
 */
export function currentRoute() {
  const hash = window.location.hash.slice(1) || '/';

  // Try exact matches first
  if (hash in ROUTES) {
    return { path: hash, params: {} };
  }

  // Try parametric routes
  if (hash.startsWith('/workout/')) {
    const id = hash.slice('/workout/'.length);
    return { path: '/workout/:id', params: { id } };
  }

  // Default to home
  return { path: '/', params: {} };
}

const routeChangeHandlers = [];

/**
 * Register a handler to be called on route change
 * @param {Function} handler - Called with currentRoute() result
 */
export function onRouteChange(handler) {
  routeChangeHandlers.push(handler);
  window.addEventListener('hashchange', () => {
    const route = currentRoute();
    handler(route);
  });
}
