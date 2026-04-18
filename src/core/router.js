/**
 * Hash-based router for Pump PWA
 * Routes: #/ (home), #/history, #/history/:id, #/workout/:id, #/picker
 */

const ROUTES = {
  '/': 'home',
  '/history': 'history',
  '/workout/:id': 'active-workout',
  '/workout/:id/summary': 'workout-summary',
  '/history/:id': 'workout-detail',
  '/template-editor/:id': 'template-editor',
  '/picker': 'picker',
};

/**
 * Navigate to a route
 * @param {string} path - e.g., '/', '/history', '/workout/abc123', '/history/abc123'
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

  // Try parametric routes (check more specific routes first)
  // Parse /workout/:id/summary BEFORE /workout/:id (more specific first)
  if (hash.startsWith('/workout/') && hash.endsWith('/summary')) {
    const id = hash.slice('/workout/'.length, -'/summary'.length);
    return { path: '/workout/:id/summary', params: { id } };
  }

  if (hash.startsWith('/history/')) {
    const id = hash.slice('/history/'.length);
    return { path: '/history/:id', params: { id } };
  }

  if (hash.startsWith('/workout/')) {
    const id = hash.slice('/workout/'.length);
    return { path: '/workout/:id', params: { id } };
  }

  // Parse /template-editor/:id
  if (hash.startsWith('/template-editor/')) {
    const id = hash.slice('/template-editor/'.length);
    return { path: '/template-editor/:id', params: { id } };
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
