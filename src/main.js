/**
 * Pump PWA Main Entrypoint
 */

import { openDb } from './core/schema.js';
import { seedIfNeeded } from './core/seed.js';
import { onRouteChange, currentRoute, navigate } from './core/router.js';

// Feature renderers are stubbed by Phase 1B agents
let renderHome, renderHistory, renderActiveWorkout;

async function loadFeatures() {
  try {
    const homeModule = await import('./features/home/home.js');
    renderHome = homeModule.renderHome;
  } catch (e) {
    console.warn('Home feature not loaded yet:', e);
  }

  try {
    const historyModule = await import('./features/history/history.js');
    renderHistory = historyModule.renderHistory;
  } catch (e) {
    console.warn('History feature not loaded yet:', e);
  }

  try {
    const activeWorkoutModule = await import('./features/active-workout/active-workout.js');
    renderActiveWorkout = activeWorkoutModule.renderActiveWorkout;
  } catch (e) {
    console.warn('ActiveWorkout feature not loaded yet:', e);
  }
}

/**
 * Route to the appropriate feature renderer
 */
function renderRoute(route) {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = '';

  if (route.path === '/') {
    if (renderHome) {
      renderHome(appEl);
    } else {
      appEl.textContent = 'Home (loading...)';
    }
  } else if (route.path === '/history') {
    if (renderHistory) {
      renderHistory(appEl);
    } else {
      appEl.textContent = 'History (loading...)';
    }
  } else if (route.path === '/workout/:id') {
    if (renderActiveWorkout) {
      renderActiveWorkout(appEl, route.params);
    } else {
      appEl.textContent = `Workout ${route.params.id} (loading...)`;
    }
  } else {
    appEl.textContent = 'Unknown route';
  }
}

/**
 * Update tab bar to highlight the active tab
 */
function updateTabBar(route) {
  document.querySelectorAll('#tabbar .tab').forEach(tab => {
    const tabRoute = tab.dataset.route;
    // Determine if this tab is active
    const isActive = (!route || route.path === '/' || route.path === '')
      ? tabRoute === '/'
      : route.path.startsWith(tabRoute) && tabRoute !== '/';
    tab.setAttribute('aria-current', isActive ? 'page' : 'false');
    tab.classList.toggle('tab--active', isActive);
  });
}

/**
 * Wire up the tab bar navigation
 */
function setupTabBar() {
  const tabButtons = document.querySelectorAll('.tab');
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const route = button.getAttribute('data-route');
      if (route) {
        navigate(route);
      }
    });
  });
}

/**
 * Register the service worker
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then((reg) => console.log('Service worker registered:', reg))
      .catch((err) => console.warn('Service worker registration failed:', err));
  }
}

/**
 * Boot the app
 */
async function boot() {
  try {
    // Initialize database
    await openDb();
    console.log('Database opened');

    // Seed initial data if needed
    await seedIfNeeded();
    console.log('Data seeded');

    // Load feature modules
    await loadFeatures();

    // Set up UI
    setupTabBar();
    registerServiceWorker();

    // Set up router and render current route
    onRouteChange((route) => {
      renderRoute(route);
      updateTabBar(route);
    });

    const initial = currentRoute();
    renderRoute(initial);
    updateTabBar(initial);
  } catch (err) {
    console.error('Boot failed:', err);
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
