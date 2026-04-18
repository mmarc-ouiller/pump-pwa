/**
 * Phase 1C — History Feature
 * Displays completed workouts grouped by date with summary stats
 * Tappable cards open detail/edit view at /history/:id
 */

import { fetchCompletedWorkouts, deleteWorkout } from '../../core/store.js';
import { formatDuration } from '../../core/format.js';
import { navigate } from '../../core/router.js';

/**
 * Render the History view
 * @param {HTMLElement} appEl - The #app container to render into
 * @returns {Promise<void>}
 */
export async function renderHistory(appEl) {
  const workouts = await fetchCompletedWorkouts(); // sorted by startedAt desc

  appEl.innerHTML = '';
  appEl.appendChild(buildHistoryView(workouts));
}

/**
 * Build the history view container
 * @param {Workout[]} workouts
 * @returns {HTMLDivElement}
 */
function buildHistoryView(workouts) {
  const container = document.createElement('div');
  container.className = 'history';

  // Header
  const header = document.createElement('div');
  header.className = 'history__header';
  const title = document.createElement('h1');
  title.className = 'history__title';
  title.textContent = 'HISTORY';
  header.appendChild(title);
  container.appendChild(header);

  if (workouts.length === 0) {
    // Empty state
    const empty = document.createElement('div');
    empty.className = 'history__empty';

    const emptyTitle = document.createElement('p');
    emptyTitle.className = 'history__empty-title';
    emptyTitle.textContent = 'NO WORKOUTS YET';
    empty.appendChild(emptyTitle);

    const emptyCaption = document.createElement('p');
    emptyCaption.className = 'history__empty-caption';
    emptyCaption.textContent = 'COMPLETE YOUR FIRST WORKOUT TO SEE YOUR HISTORY';
    empty.appendChild(emptyCaption);

    container.appendChild(empty);
    return container;
  }

  // Group by date with smart labels
  const groups = groupByDate(workouts);

  groups.forEach(({ dateLabel, workouts: groupWorkouts }) => {
    const section = document.createElement('div');
    section.className = 'history__section';

    // Sticky date header
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'history__section-header';
    sectionHeader.textContent = dateLabel;
    section.appendChild(sectionHeader);

    groupWorkouts.forEach(workout => {
      section.appendChild(buildWorkoutCard(workout, container));
    });

    container.appendChild(section);
  });

  return container;
}

/**
 * Group workouts by date with smart labels (Today/Yesterday/date)
 * @param {Workout[]} workouts
 * @returns {Array<{dateLabel: string, workouts: Workout[]}>}
 */
function groupByDate(workouts) {
  const map = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  workouts.forEach(w => {
    const date = new Date(w.completedAt || w.startedAt);
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString().slice(0, 10); // YYYY-MM-DD

    let label;
    if (date.getTime() === today.getTime()) {
      label = 'TODAY';
    } else if (date.getTime() === yesterday.getTime()) {
      label = 'YESTERDAY';
    } else {
      label = date.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      }).toUpperCase();
    }

    if (!map.has(key)) {
      map.set(key, { dateLabel: label, workouts: [] });
    }
    map.get(key).workouts.push(w);
  });

  return Array.from(map.values());
}

/**
 * Build a single workout card
 * @param {Workout} workout
 * @param {HTMLElement} container - Parent container for re-render access
 * @returns {HTMLDivElement}
 */
function buildWorkoutCard(workout, container) {
  // Calculate stats
  const totalSets = workout.exercises.reduce((sum, we) => sum + we.sets.length, 0);
  const completedSets = workout.exercises.reduce((sum, we) =>
    sum + we.sets.filter(s => s.isCompleted).length, 0);
  const exerciseCount = workout.exercises.length;

  const startTime = new Date(workout.startedAt);
  const endTime = new Date(workout.completedAt);
  const pausedMs = (workout.totalPausedDuration || 0) * 1000;
  const durationSecs = Math.floor((endTime - startTime) / 1000 - pausedMs / 1000);

  // Exercise names preview (first 3 + "N MORE")
  const names = workout.exercises.map(we => we.exerciseName);
  let exercisePreview = names.slice(0, 3).join(', ');
  if (names.length > 3) {
    exercisePreview += `, +${names.length - 3} MORE`;
  }

  const cardContent = document.createElement('div');
  cardContent.className = 'history__workout';

  // Make card tappable to open detail view
  cardContent.addEventListener('click', (e) => {
    // Don't navigate if the delete button was clicked
    if (e.target === deleteBtn || e.target.closest('.history__delete-btn')) {
      return;
    }
    navigate(`/history/${workout.id}`);
  });

  // Workout header with name and delete button
  const workoutHeader = document.createElement('div');
  workoutHeader.className = 'history__workout-header';

  const workoutName = document.createElement('span');
  workoutName.className = 'history__workout-name';
  workoutName.textContent = workout.name;
  workoutHeader.appendChild(workoutName);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'history__delete-btn';
  deleteBtn.setAttribute('aria-label', `Delete ${workout.name}`);
  deleteBtn.textContent = '✕';
  workoutHeader.appendChild(deleteBtn);

  cardContent.appendChild(workoutHeader);

  // Stats section (date/time + duration)
  const dateTimeEl = document.createElement('div');
  dateTimeEl.className = 'history__datetime';
  const timeStr = startTime.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
  dateTimeEl.textContent = `${timeStr} · ${formatDuration(durationSecs)}`;
  cardContent.appendChild(dateTimeEl);

  // Exercise count + completed sets
  const summaryEl = document.createElement('div');
  summaryEl.className = 'history__summary';
  summaryEl.textContent = `${exerciseCount} EXERCISE${exerciseCount !== 1 ? 'S' : ''} · ${completedSets}/${totalSets} SETS`;
  cardContent.appendChild(summaryEl);

  // Wire delete button
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${workout.name}"? This cannot be undone.`)) {
      try {
        await deleteWorkout(workout);
        // Re-render the whole history
        const appEl = container.closest('#app') || container.parentElement;
        if (appEl) {
          renderHistory(appEl);
        }
      } catch (error) {
        console.error('Failed to delete workout:', error);
      }
    }
  });

  return cardContent;
}
