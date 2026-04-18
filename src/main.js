/**
 * Pump PWA Main Entrypoint
 */

import { openDb } from './core/schema.js';
import { seedIfNeeded } from './core/seed.js';
import { onRouteChange, currentRoute, navigate } from './core/router.js';

const appEl = document.getElementById('app');

/**
 * Route to the appropriate feature renderer
 */
async function renderRoute(route) {
  if (!appEl) return;
  appEl.innerHTML = '';

  const path = route?.path || '/';

  try {
    if (path === '/' || path === '') {
      const { renderHome } = await import('./features/home/home.js');
      await renderHome(appEl);
    } else if (path === '/history') {
      const { renderHistory } = await import('./features/history/history.js');
      await renderHistory(appEl);
    } else if (path === '/history/:id') {
      const { renderWorkoutDetail } = await import('./features/workout-detail/workout-detail.js');
      await renderWorkoutDetail(appEl, { id: route.params.id });
    } else if (path === '/workout/:id/summary') {
      const { renderWorkoutSummary } = await import('./features/workout-summary/workout-summary.js');
      await renderWorkoutSummary(appEl, { id: route.params.id });
    } else if (path === '/workout/:id') {
      const { renderActiveWorkout } = await import('./features/active-workout/active-workout.js');
      await renderActiveWorkout(appEl, { id: route.params.id });
    } else if (path === '/template-editor/:id') {
      const { renderTemplateEditor } = await import('./features/template-editor/template-editor.js');
      await renderTemplateEditor(appEl, { id: route.params.id });
    } else if (path === '/stats') {
      const { renderStats } = await import('./features/stats/stats.js');
      await renderStats(appEl);
    } else if (path === '/exercises') {
      const { renderExercises } = await import('./features/exercises/exercises.js');
      await renderExercises(appEl);
    } else {
      const { renderHome } = await import('./features/home/home.js');
      await renderHome(appEl);
    }
  } catch (err) {
    console.error('Route render error:', err);
    appEl.innerHTML = `<div style="padding:24px;font-family:monospace;font-size:0.875rem">ERROR LOADING PAGE<br><small>${err.message}</small></div>`;
  }
}

/**
 * Update tab bar to highlight the active tab
 */
function updateTabBar(route) {
  const path = route?.path || '/';
  document.querySelectorAll('#tabbar .tab').forEach(tab => {
    const tabRoute = tab.dataset.route;
    let isActive = false;
    if (tabRoute === '/') {
      isActive = (path === '/' || path === '' || path === '/workout/:id' ||
                  path === '/workout/:id/summary' || path === '/template-editor/:id');
    } else {
      isActive = path === tabRoute || path.startsWith(tabRoute + '/');
    }
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

    // Set up UI
    setupTabBar();
    registerServiceWorker();

    // Set up router and render current route
    onRouteChange((route) => {
      renderRoute(route);
      updateTabBar(route);
    });

    const initial = currentRoute();
    await renderRoute(initial);
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
