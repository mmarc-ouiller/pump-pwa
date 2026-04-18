/**
 * Phase 1B.3 — History Feature
 * Displays completed workouts grouped by date with summary stats
 */

import { fetchCompletedWorkouts, deleteWorkout } from '../../core/store.js';
import { formatDuration } from '../../core/format.js';

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
    emptyCaption.textContent = 'Completed workouts will appear here.';
    empty.appendChild(emptyCaption);

    container.appendChild(empty);
    return container;
  }

  // Group by date
  const groups = groupByDate(workouts);

  groups.forEach(({ dateLabel, workouts: groupWorkouts }) => {
    const section = document.createElement('div');
    section.className = 'history__section';

    // Sticky date header
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'history__section-header';
    sectionHeader.textContent = dateLabel; // e.g. "SATURDAY, APR 18"
    section.appendChild(sectionHeader);

    groupWorkouts.forEach(workout => {
      section.appendChild(buildWorkoutCard(workout, container));
    });

    container.appendChild(section);
  });

  return container;
}

/**
 * Group workouts by date
 * @param {Workout[]} workouts
 * @returns {Array<{dateLabel: string, workouts: Workout[]}>}
 */
function groupByDate(workouts) {
  const map = new Map();
  workouts.forEach(w => {
    const date = new Date(w.completedAt);
    const key = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const label = date.toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric'
    }).toUpperCase(); // "SATURDAY, APR 18"

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
  const durationSecs = Math.floor((endTime - startTime) / 1000);

  // Exercise names preview (first 3 + "N MORE")
  const names = workout.exercises.map(we => we.exerciseName);
  let exercisePreview = names.slice(0, 3).join(', ');
  if (names.length > 3) {
    exercisePreview += `, +${names.length - 3} MORE`;
  }

  const cardContent = document.createElement('div');
  cardContent.className = 'history__workout';

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
  deleteBtn.textContent = '×';
  workoutHeader.appendChild(deleteBtn);

  cardContent.appendChild(workoutHeader);

  // Stats section
  const statsContainer = document.createElement('div');
  statsContainer.className = 'history__stats';

  const durationStat = document.createElement('span');
  durationStat.className = 'history__stat';
  const durationLabel = document.createElement('span');
  durationLabel.className = 'history__stat-label';
  durationLabel.textContent = 'DURATION';
  durationStat.appendChild(durationLabel);
  durationStat.appendChild(document.createTextNode(formatDuration(durationSecs)));
  statsContainer.appendChild(durationStat);

  const exercisesStat = document.createElement('span');
  exercisesStat.className = 'history__stat';
  const exercisesLabel = document.createElement('span');
  exercisesLabel.className = 'history__stat-label';
  exercisesLabel.textContent = 'EXERCISES';
  exercisesStat.appendChild(exercisesLabel);
  exercisesStat.appendChild(document.createTextNode(String(exerciseCount)));
  statsContainer.appendChild(exercisesStat);

  const setsStat = document.createElement('span');
  setsStat.className = 'history__stat';
  const setsLabel = document.createElement('span');
  setsLabel.className = 'history__stat-label';
  setsLabel.textContent = 'SETS';
  setsStat.appendChild(setsLabel);
  setsStat.appendChild(document.createTextNode(`${completedSets}/${totalSets}`));
  statsContainer.appendChild(setsStat);

  cardContent.appendChild(statsContainer);

  // Exercise preview
  if (exercisePreview) {
    const previewEl = document.createElement('div');
    previewEl.className = 'history__exercises-preview';
    previewEl.textContent = exercisePreview;
    cardContent.appendChild(previewEl);
  }

  // Wire delete button
  deleteBtn.addEventListener('click', async () => {
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
