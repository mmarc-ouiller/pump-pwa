/**
 * Phase 1A — Home Screen (Rewritten)
 * Main entry point for Pump home view
 * Displays: header, active/planning/paused workout card, daily tip, templates card-stack, quick start
 */

import {
  fetchTemplates,
  fetchActiveWorkout,
  fetchCompletedWorkouts,
  createWorkout,
  startWorkoutFromTemplate,
  deleteTemplate,
  duplicateTemplate,
} from '../../core/store.js';
import { formatCurrentDate, formatDuration } from '../../core/format.js';
import { navigate } from '../../core/router.js';
import { renderCardStack } from './card-stack.js';
import { tipForToday } from './daily-tips.js';

let timerInterval = null; // for live-ticking elapsed time on active workout

/**
 * Main render entry point
 * @param {HTMLElement} appEl - The #app container to render into
 * @returns {Promise<void>}
 */
export async function renderHome(appEl) {
  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Load data
  const [templates, activeWorkout, completedWorkouts] = await Promise.all([
    fetchTemplates(),
    fetchActiveWorkout(),
    fetchCompletedWorkouts(),
  ]);

  // Build completion counts map
  const completedCounts = {};
  if (completedWorkouts) {
    completedWorkouts.forEach(w => {
      if (w.templateId) {
        completedCounts[w.templateId] = (completedCounts[w.templateId] || 0) + 1;
      }
    });
  }

  // Render the view
  appEl.innerHTML = '';
  appEl.appendChild(buildHomeView(templates, activeWorkout, completedCounts));

  // Set up live timer if there's an active workout
  if (activeWorkout && activeWorkout.startedAt) {
    const timerEl = appEl.querySelector('.home__active-elapsed');
    if (timerEl) {
      // Update immediately, then every second
      updateTimer(timerEl, activeWorkout);
      timerInterval = setInterval(() => {
        updateTimer(timerEl, activeWorkout);
      }, 1000);
    }
  }
}

/**
 * Update the elapsed time display for an active workout
 * @param {HTMLElement} el
 * @param {Workout} workout
 */
function updateTimer(el, workout) {
  if (!workout.startedAt) return;

  const startTime = new Date(workout.startedAt).getTime();
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  el.textContent = formatDuration(elapsedSeconds);
}

/**
 * Build the full home view
 * @param {Template[]} templates
 * @param {Workout | null} activeWorkout
 * @param {Object} completedCounts
 * @returns {HTMLDivElement}
 */
function buildHomeView(templates, activeWorkout, completedCounts) {
  const container = document.createElement('div');
  container.className = 'home';

  // Header: "PUMP" title + date
  const header = document.createElement('div');
  header.className = 'home__header';
  const title = document.createElement('h1');
  title.className = 'home__title';
  title.textContent = 'PUMP';
  const date = document.createElement('p');
  date.className = 'home__date';
  date.textContent = formatCurrentDate();
  header.appendChild(title);
  header.appendChild(date);
  container.appendChild(header);

  // Active/planning/paused workout card (if exists)
  if (activeWorkout) {
    container.appendChild(buildActiveWorkoutCard(activeWorkout));
  }

  // Daily tip card (lightbulb + tip text)
  const tipCard = buildTipCard();
  container.appendChild(tipCard);

  // Templates section: heading + card-stack + new template button
  const templatesSection = document.createElement('section');
  templatesSection.className = 'home__templates-section';

  const templatesHeading = document.createElement('h2');
  templatesHeading.className = 'home__section-heading';
  templatesHeading.textContent = 'TEMPLATES';
  templatesSection.appendChild(templatesHeading);

  // Card stack container
  const cardStackContainer = document.createElement('div');
  cardStackContainer.className = 'home__card-stack-wrapper';
  templatesSection.appendChild(cardStackContainer);

  // Render card stack with handlers
  renderCardStack(
    cardStackContainer,
    templates,
    {
      onStart: async (template) => {
        const { showTemplateDetails } = await import('../template-details/template-details.js');
        showTemplateDetails(template, {
          activeWorkoutExists: !!activeWorkout,
          onStart: () => startTemplateWorkout(template),
          onEdit: () => navigate(`/template-editor/${template.id}`),
          onDuplicate: async () => {
            await duplicateTemplate(template);
            const appEl = document.getElementById('app');
            if (appEl) await renderHome(appEl);
          },
        });
      },
      onEdit: (template) => {
        navigate(`/template-editor/${template.id}`);
      },
      onDuplicate: async (template) => {
        await duplicateTemplate(template);
        // Re-render home to show the new duplicated template
        const appEl = document.getElementById('app');
        if (appEl) {
          await renderHome(appEl);
        }
      },
      onDelete: async (template) => {
        const confirmed = window.confirm(`Delete "${template.name}"?`);
        if (confirmed) {
          await deleteTemplate(template);
          // Re-render home to remove the deleted template
          const appEl = document.getElementById('app');
          if (appEl) {
            await renderHome(appEl);
          }
        }
      },
      activeWorkoutExists: !!activeWorkout,
    },
    completedCounts
  );

  // New template button
  const newTemplateBtn = document.createElement('button');
  newTemplateBtn.className = 'btn btn--outline home__new-template-btn';
  newTemplateBtn.textContent = '+ NEW TEMPLATE';
  newTemplateBtn.addEventListener('click', () => {
    navigate('/template-editor/new');
  });
  templatesSection.appendChild(newTemplateBtn);

  container.appendChild(templatesSection);

  // Quick Start button (only if no active workout)
  if (!activeWorkout) {
    const quickStartBtn = document.createElement('button');
    quickStartBtn.className = 'btn btn--solid home__quick-start-btn';
    quickStartBtn.textContent = 'QUICK START';
    quickStartBtn.addEventListener('click', async () => {
      await quickStart();
    });
    container.appendChild(quickStartBtn);
  }

  return container;
}

/**
 * Build the active/planning/paused workout card
 * @param {Workout} workout
 * @returns {HTMLDivElement}
 */
function buildActiveWorkoutCard(workout) {
  const card = document.createElement('div');
  card.className = 'home__active-card card card--shadow';

  // Label with badge (ACTIVE, PLANNING, or PAUSED)
  const labelRow = document.createElement('div');
  labelRow.className = 'home__active-label-row';

  const label = document.createElement('div');
  label.className = 'home__active-label';
  label.textContent = 'ACTIVE WORKOUT';

  let badge;
  if (workout.pausedAt !== null) {
    badge = document.createElement('span');
    badge.className = 'home__badge home__badge--paused';
    badge.textContent = 'PAUSED';
  } else if (workout.startedAt === null) {
    badge = document.createElement('span');
    badge.className = 'home__badge home__badge--planning';
    badge.textContent = 'PLANNING';
  }

  labelRow.appendChild(label);
  if (badge) {
    labelRow.appendChild(badge);
  }
  card.appendChild(labelRow);

  // Workout name
  const name = document.createElement('div');
  name.className = 'home__active-name';
  name.textContent = workout.name;
  card.appendChild(name);

  // Elapsed time (only show if started)
  if (workout.startedAt !== null) {
    const timerLabel = document.createElement('div');
    timerLabel.className = 'home__active-timer-label';
    timerLabel.textContent = 'ELAPSED';
    card.appendChild(timerLabel);

    const elapsed = document.createElement('div');
    elapsed.className = 'home__active-elapsed';
    elapsed.textContent = '0 MIN'; // Will be updated by setInterval
    card.appendChild(elapsed);
  }

  // Continue button
  const continueBtn = document.createElement('button');
  continueBtn.className = 'btn btn--solid home__active-continue-btn';
  continueBtn.textContent = 'CONTINUE';
  continueBtn.addEventListener('click', () => {
    navigate(`/workout/${workout.id}`);
  });
  card.appendChild(continueBtn);

  return card;
}

/**
 * Build the daily tip card
 * @returns {HTMLDivElement}
 */
function buildTipCard() {
  const card = document.createElement('div');
  card.className = 'home__tip-card';

  const tipText = document.createElement('div');
  tipText.className = 'home__tip-text';
  tipText.innerHTML = `💡 ${tipForToday()}`;

  card.appendChild(tipText);
  return card;
}

/**
 * Start a workout from a template
 * Includes 3-second countdown before starting
 * @param {Template} template
 */
async function startTemplateWorkout(template) {
  try {
    const workout = await startWorkoutFromTemplate(template);
    const { showCountdown } = await import('../../../components/countdown.js');
    showCountdown({ onComplete: () => navigate(`/workout/${workout.id}`) });
  } catch (error) {
    console.error('Failed to start workout from template:', error);
  }
}

/**
 * Execute quick start flow
 * Creates a new workout and navigates to it
 * Includes 3-second countdown before starting
 */
async function quickStart() {
  try {
    const workout = await createWorkout({ name: 'Quick Workout' });
    const { showCountdown } = await import('../../components/countdown.js');
    showCountdown({ onComplete: () => navigate(`/workout/${workout.id}`) });
  } catch (error) {
    console.error('Failed to create quick start workout:', error);
  }
}
