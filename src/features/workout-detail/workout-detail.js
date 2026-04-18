/**
 * Phase 1C — Workout Detail + Edit
 * Full-page detail view for editing completed workouts
 * Route: /history/:id
 */

import {
  fetchCompletedWorkouts,
  deleteWorkout,
  updateWorkoutName,
  updateWorkoutDates,
  convertWorkoutToTemplate,
} from '../../core/store.js';
import { formatDuration } from '../../core/format.js';
import { navigate } from '../../core/router.js';

/**
 * Render the workout detail view
 * @param {HTMLElement} appEl - The #app container to render into
 * @param {{ id: string }} params - Route params with workout id
 * @returns {Promise<void>}
 */
export async function renderWorkoutDetail(appEl, { id }) {
  const workouts = await fetchCompletedWorkouts();
  const workout = workouts.find(w => w.id === id);

  if (!workout) {
    navigate('/history');
    return;
  }

  appEl.innerHTML = '';
  appEl.appendChild(buildDetailView(workout, appEl));
}

/**
 * Build the workout detail view container
 * @param {Workout} workout
 * @param {HTMLElement} appEl - App container for re-render
 * @returns {HTMLDivElement}
 */
function buildDetailView(workout, appEl) {
  const container = document.createElement('div');
  container.className = 'workout-detail';

  // Header with back button and editable name
  const header = buildHeader(workout, appEl);
  container.appendChild(header);

  // Date editors (start/end times)
  const dateSection = buildDateSection(workout, appEl);
  container.appendChild(dateSection);

  // Exercise + sets view (read-only, structured like Phase 1B)
  const exercisesSection = buildExercisesSection(workout);
  container.appendChild(exercisesSection);

  // Action buttons at bottom
  const actionsSection = buildActionsSection(workout, appEl);
  container.appendChild(actionsSection);

  return container;
}

/**
 * Build the header with back button and editable name
 * @param {Workout} workout
 * @param {HTMLElement} appEl
 * @returns {HTMLDivElement}
 */
function buildHeader(workout, appEl) {
  const header = document.createElement('div');
  header.className = 'workout-detail__header';

  const backBtn = document.createElement('button');
  backBtn.className = 'workout-detail__back-btn';
  backBtn.setAttribute('aria-label', 'Back to history');
  backBtn.textContent = '←';
  backBtn.addEventListener('click', () => navigate('/history'));
  header.appendChild(backBtn);

  const nameInput = document.createElement('input');
  nameInput.className = 'workout-detail__name-input';
  nameInput.type = 'text';
  nameInput.value = workout.name;
  nameInput.addEventListener('blur', async () => {
    const newName = nameInput.value.trim() || workout.name;
    if (newName !== workout.name) {
      try {
        await updateWorkoutName(workout, newName);
        workout.name = newName;
      } catch (error) {
        console.error('Failed to update workout name:', error);
        nameInput.value = workout.name;
      }
    }
  });
  header.appendChild(nameInput);

  return header;
}

/**
 * Build the date/time editor section
 * @param {Workout} workout
 * @param {HTMLElement} appEl
 * @returns {HTMLDivElement}
 */
function buildDateSection(workout, appEl) {
  const section = document.createElement('div');
  section.className = 'workout-detail__date-section';

  // Start date/time
  const startLabel = document.createElement('label');
  startLabel.className = 'workout-detail__date-label';
  startLabel.textContent = 'STARTED';
  section.appendChild(startLabel);

  const startInput = document.createElement('input');
  startInput.className = 'workout-detail__date-input';
  startInput.type = 'datetime-local';
  startInput.value = formatDateTimeLocal(workout.startedAt);
  startInput.addEventListener('change', async () => {
    const newStart = new Date(startInput.value).toISOString();
    try {
      await updateWorkoutDates(workout, newStart, workout.completedAt);
      workout.startedAt = newStart;
    } catch (error) {
      console.error('Failed to update start date:', error);
      startInput.value = formatDateTimeLocal(workout.startedAt);
    }
  });
  section.appendChild(startInput);

  // End date/time
  const endLabel = document.createElement('label');
  endLabel.className = 'workout-detail__date-label';
  endLabel.textContent = 'COMPLETED';
  section.appendChild(endLabel);

  const endInput = document.createElement('input');
  endInput.className = 'workout-detail__date-input';
  endInput.type = 'datetime-local';
  endInput.value = formatDateTimeLocal(workout.completedAt);
  endInput.addEventListener('change', async () => {
    const newEnd = new Date(endInput.value).toISOString();
    try {
      await updateWorkoutDates(workout, workout.startedAt, newEnd);
      workout.completedAt = newEnd;
    } catch (error) {
      console.error('Failed to update end date:', error);
      endInput.value = formatDateTimeLocal(workout.completedAt);
    }
  });
  section.appendChild(endInput);

  // Computed duration display
  const durationEl = document.createElement('div');
  durationEl.className = 'workout-detail__duration';
  const startTime = new Date(workout.startedAt);
  const endTime = new Date(workout.completedAt);
  const pausedMs = (workout.totalPausedDuration || 0) * 1000;
  const durationSecs = Math.floor((endTime - startTime) / 1000 - pausedMs / 1000);
  durationEl.textContent = `Duration: ${formatDuration(durationSecs)}`;
  section.appendChild(durationEl);

  return section;
}

/**
 * Build the exercises + sets view (read-only display matching Phase 1B structure)
 * @param {Workout} workout
 * @returns {HTMLDivElement}
 */
function buildExercisesSection(workout) {
  const section = document.createElement('div');
  section.className = 'workout-detail__exercises-section';

  if (workout.exercises.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'workout-detail__empty-exercises';
    empty.textContent = 'No exercises in this workout';
    section.appendChild(empty);
    return section;
  }

  workout.exercises.forEach(workoutExercise => {
    const exerciseCard = document.createElement('div');
    exerciseCard.className = 'workout-detail__exercise-card';

    // Exercise heading
    const heading = document.createElement('h3');
    heading.className = 'workout-detail__exercise-name';
    heading.textContent = workoutExercise.exerciseName;
    exerciseCard.appendChild(heading);

    // Sets table/list
    const setsList = document.createElement('div');
    setsList.className = 'workout-detail__sets-list';

    workoutExercise.sets.forEach((set, setIndex) => {
      const setRow = buildDetailSetRow(set, setIndex + 1, workoutExercise.measureBy);
      setsList.appendChild(setRow);
    });

    exerciseCard.appendChild(setsList);
    section.appendChild(exerciseCard);
  });

  return section;
}

/**
 * Build a read-only set row for the detail view
 * Matches the CSS structure from Phase 1B (active-workout)
 * @param {ExerciseSet} set
 * @param {number} setIndex - 1-based index
 * @param {string} measureBy - 'weight' | 'seconds' | 'repsOnly' | 'cardio'
 * @returns {HTMLDivElement}
 */
function buildDetailSetRow(set, setIndex, measureBy) {
  const isCardio = measureBy === 'cardio' || measureBy === 'seconds';
  const row = document.createElement('div');
  row.className = `workout-detail__set-row workout-detail__set-row--${
    measureBy === 'weight' ? 'weight' :
    measureBy === 'repsOnly' ? 'reps-only' :
    measureBy === 'seconds' ? 'seconds' : 'cardio'
  }${set.isCompleted ? ' workout-detail__set-row--completed' : ''}`;

  // Set number
  const indexEl = document.createElement('span');
  indexEl.className = 'workout-detail__set-index';
  indexEl.textContent = String(setIndex);
  row.appendChild(indexEl);

  // Display values based on measureBy type
  if (measureBy === 'weight') {
    // Weight + Reps
    const weightEl = document.createElement('span');
    weightEl.className = 'workout-detail__set-value';
    weightEl.textContent = set.weight != null ? `${Math.round(set.weight)} lb` : '—';
    row.appendChild(weightEl);

    const repsEl = document.createElement('span');
    repsEl.className = 'workout-detail__set-value';
    repsEl.textContent = set.reps != null ? `${set.reps} reps` : '—';
    row.appendChild(repsEl);
  } else if (measureBy === 'repsOnly') {
    // Reps only
    const repsEl = document.createElement('span');
    repsEl.className = 'workout-detail__set-value';
    repsEl.textContent = set.reps != null ? `${set.reps} reps` : '—';
    row.appendChild(repsEl);
  } else if (measureBy === 'seconds') {
    // Duration
    const durationEl = document.createElement('span');
    durationEl.className = 'workout-detail__set-value';
    if (set.duration != null) {
      const mins = Math.floor(set.duration / 60);
      const secs = set.duration % 60;
      durationEl.textContent = secs > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${mins} s`;
    } else {
      durationEl.textContent = '—';
    }
    row.appendChild(durationEl);
  } else if (measureBy === 'cardio') {
    // Duration, Speed, Incline, Resistance
    const durationEl = document.createElement('span');
    durationEl.className = 'workout-detail__set-value';
    durationEl.textContent = set.duration != null ? `${set.duration} min` : '—';
    row.appendChild(durationEl);

    const speedEl = document.createElement('span');
    speedEl.className = 'workout-detail__set-value';
    speedEl.textContent = set.speed != null ? `${set.speed} mph` : '—';
    row.appendChild(speedEl);

    const inclineEl = document.createElement('span');
    inclineEl.className = 'workout-detail__set-value';
    inclineEl.textContent = set.incline != null ? `${set.incline}%` : '—';
    row.appendChild(inclineEl);

    const resistanceEl = document.createElement('span');
    resistanceEl.className = 'workout-detail__set-value';
    resistanceEl.textContent = set.resistance != null ? `L${set.resistance}` : '—';
    row.appendChild(resistanceEl);
  }

  // Completion checkmark
  const checkEl = document.createElement('span');
  checkEl.className = `workout-detail__set-check${set.isCompleted ? ' workout-detail__set-check--done' : ''}`;
  checkEl.textContent = set.isCompleted ? '✓' : '○';
  row.appendChild(checkEl);

  return row;
}

/**
 * Build the action buttons section
 * @param {Workout} workout
 * @param {HTMLElement} appEl
 * @returns {HTMLDivElement}
 */
function buildActionsSection(workout, appEl) {
  const section = document.createElement('div');
  section.className = 'workout-detail__actions';

  // Convert to template button
  const convertBtn = document.createElement('button');
  convertBtn.className = 'workout-detail__action-btn workout-detail__action-btn--primary';
  convertBtn.textContent = 'CONVERT TO TEMPLATE';
  convertBtn.addEventListener('click', async () => {
    const templateName = window.prompt('Template name:', workout.name);
    if (templateName) {
      try {
        await convertWorkoutToTemplate(workout, templateName);
        window.alert(`Template "${templateName}" created!`);
        navigate('/');
      } catch (error) {
        console.error('Failed to convert to template:', error);
        window.alert('Failed to create template');
      }
    }
  });
  section.appendChild(convertBtn);

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'workout-detail__action-btn workout-detail__action-btn--destructive';
  deleteBtn.textContent = 'DELETE WORKOUT';
  deleteBtn.addEventListener('click', async () => {
    if (window.confirm(`Delete "${workout.name}"? This cannot be undone.`)) {
      try {
        await deleteWorkout(workout);
        navigate('/history');
      } catch (error) {
        console.error('Failed to delete workout:', error);
        window.alert('Failed to delete workout');
      }
    }
  });
  section.appendChild(deleteBtn);

  return section;
}

/**
 * Format an ISO datetime string for datetime-local input
 * @param {string} isoString
 * @returns {string} formatted for datetime-local input
 */
function formatDateTimeLocal(isoString) {
  const date = new Date(isoString);
  return date.toISOString().slice(0, 16);
}
