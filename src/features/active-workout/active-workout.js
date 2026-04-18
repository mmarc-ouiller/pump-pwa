/**
 * Phase 1B.2 — Active Workout Feature
 * Main workout logging screen with live timer, set tracking, and exercise management
 */

import { openDb } from '../../core/schema.js';
import {
  completeWorkout,
  deleteWorkout,
  addSetTo,
  updateSet,
  toggleSetCompleted,
  addExerciseToWorkout,
  removeExerciseFromWorkout,
} from '../../core/store.js';
import { formatDuration } from '../../core/format.js';
import { renderButton } from '../../components/button.js';
import { navigate } from '../../core/router.js';
import { openExercisePicker } from '../exercise-picker/exercise-picker.js';

// ============================================================================
// State Management
// ============================================================================

let timerInterval = null;
const debounceTimers = {}; // setId → timer

/**
 * Fetch a workout by ID from IndexedDB
 * @param {string} id
 * @returns {Promise<Workout | null>}
 */
async function fetchWorkoutById(id) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workouts', 'readonly');
      const req = tx.objectStore('workouts').get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error('fetchWorkoutById failed:', error);
    return null;
  }
}

/**
 * Render the Active Workout view
 * @param {HTMLElement} appEl - The #app container to render into
 * @param {{ id: string }} params - Route params containing workout id
 * @returns {Promise<void>}
 */
export async function renderActiveWorkout(appEl, { id }) {
  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Load the workout from the database
  let workout = await fetchWorkoutById(id);
  if (!workout) {
    console.error(`Workout ${id} not found`);
    navigate('/');
    return;
  }

  // Clear the app container
  appEl.innerHTML = '';

  // Build the main scaffold
  const scaffold = document.createElement('div');
  scaffold.className = 'active-workout';

  // Build header (workout name + live timer)
  const header = buildHeader(workout);
  scaffold.appendChild(header);

  // Build actions row (DISCARD button on left, FINISH on right)
  const actionsRow = buildActionsRow(async (action) => {
    if (action === 'discard') {
      if (window.confirm('Discard this workout? This cannot be undone.')) {
        if (timerInterval) clearInterval(timerInterval);
        await deleteWorkout(workout);
        navigate('/');
      }
    } else if (action === 'finish') {
      if (window.confirm('Complete this workout?')) {
        if (timerInterval) clearInterval(timerInterval);
        await completeWorkout(workout);
        navigate('/');
      }
    }
  });
  scaffold.appendChild(actionsRow);

  // Build exercises container (scrollable)
  const exercisesContainer = document.createElement('div');
  exercisesContainer.className = 'active-workout__exercises';
  scaffold.appendChild(exercisesContainer);

  appEl.appendChild(scaffold);

  /**
   * Re-render only the exercises section (preserves focus on inputs)
   */
  async function rerenderExercises() {
    exercisesContainer.innerHTML = '';

    // Render each exercise card
    for (const workoutExercise of workout.exercises) {
      const card = buildExerciseCard(workoutExercise);
      exercisesContainer.appendChild(card);
    }

    // Add Exercise button
    const addExBtn = renderButton({
      title: '+ ADD EXERCISE',
      variant: 'outline',
    });
    addExBtn.className += ' active-workout__add-exercise';
    addExBtn.addEventListener('click', () => {
      openExercisePicker({
        onSelect: async (exercise) => {
          workout = await addExerciseToWorkout(workout, exercise);
          await rerenderExercises();
        },
      });
    });
    exercisesContainer.appendChild(addExBtn);

    // Finish Workout button
    const finishBtn = renderButton({
      title: 'FINISH WORKOUT',
      variant: 'solid',
    });
    finishBtn.className += ' active-workout__finish';
    finishBtn.addEventListener('click', async () => {
      if (window.confirm('Complete this workout?')) {
        if (timerInterval) clearInterval(timerInterval);
        await completeWorkout(workout);
        navigate('/');
      }
    });
    exercisesContainer.appendChild(finishBtn);
  }

  /**
   * Build a single exercise card
   */
  function buildExerciseCard(workoutExercise) {
    const card = document.createElement('div');
    card.className = 'active-workout__exercise-card';

    // Exercise header (name + remove button)
    const exHeader = document.createElement('div');
    exHeader.className = 'active-workout__exercise-header';

    const exName = document.createElement('span');
    exName.className = 'active-workout__exercise-name';
    exName.textContent = workoutExercise.exerciseName.toUpperCase();
    exHeader.appendChild(exName);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'active-workout__remove-btn';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `Remove ${workoutExercise.exerciseName}`);
    removeBtn.addEventListener('click', async () => {
      if (window.confirm(`Remove ${workoutExercise.exerciseName}?`)) {
        workout = await removeExerciseFromWorkout(workout, workoutExercise.id);
        await rerenderExercises();
      }
    });
    exHeader.appendChild(removeBtn);
    card.appendChild(exHeader);

    // Column headers
    const isCardio = workoutExercise.exerciseType === 'cardio';
    const colHeaders = document.createElement('div');
    colHeaders.className = `active-workout__col-headers active-workout__col-headers--${isCardio ? 'cardio' : 'strength'}`;
    if (isCardio) {
      colHeaders.innerHTML = '<span>SET</span><span>DUR</span><span>SPD</span><span>INC</span><span>RES</span><span></span>';
    } else {
      colHeaders.innerHTML = '<span>SET</span><span>WEIGHT</span><span>REPS</span><span></span>';
    }
    card.appendChild(colHeaders);

    // Set rows
    workoutExercise.sets.forEach((set, idx) => {
      const row = buildSetRow(set, idx + 1, workoutExercise, isCardio);
      card.appendChild(row);
    });

    // + SET button
    const addSetBtn = renderButton({
      title: '+ SET',
      variant: 'outline',
    });
    addSetBtn.className += ' active-workout__add-set';
    addSetBtn.addEventListener('click', async () => {
      workout = await addSetTo(workout, workoutExercise.id);
      await rerenderExercises();
    });
    card.appendChild(addSetBtn);

    return card;
  }

  /**
   * Build a single set row
   */
  function buildSetRow(set, setIndex, workoutExercise, isCardio) {
    const row = document.createElement('div');
    row.className = `active-workout__set-row active-workout__set-row--${isCardio ? 'cardio' : 'strength'}${set.isCompleted ? ' active-workout__set-row--completed' : ''}`;

    // Set index
    const indexEl = document.createElement('span');
    indexEl.className = 'active-workout__set-index';
    indexEl.textContent = setIndex;
    row.appendChild(indexEl);

    // Input fields (weight/reps for strength, duration/speed/incline/resistance for cardio)
    if (isCardio) {
      // Duration (minutes)
      const durationInput = document.createElement('input');
      durationInput.className = 'active-workout__set-input';
      durationInput.type = 'text';
      durationInput.inputMode = 'decimal';
      durationInput.placeholder = 'MIN';
      durationInput.value = set.duration != null ? set.duration : '';
      durationInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimers[set.id + '_dur']);
        debounceTimers[set.id + '_dur'] = setTimeout(async () => {
          const v = parseFloat(e.target.value);
          workout = await updateSet(workout, set.id, { duration: isNaN(v) ? null : v });
        }, 250);
      });
      row.appendChild(durationInput);

      // Speed (mph)
      const speedInput = document.createElement('input');
      speedInput.className = 'active-workout__set-input';
      speedInput.type = 'text';
      speedInput.inputMode = 'decimal';
      speedInput.placeholder = 'MPH';
      speedInput.value = set.speed != null ? set.speed : '';
      speedInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimers[set.id + '_spd']);
        debounceTimers[set.id + '_spd'] = setTimeout(async () => {
          const v = parseFloat(e.target.value);
          workout = await updateSet(workout, set.id, { speed: isNaN(v) ? null : v });
        }, 250);
      });
      row.appendChild(speedInput);

      // Incline (%)
      const inclineInput = document.createElement('input');
      inclineInput.className = 'active-workout__set-input';
      inclineInput.type = 'text';
      inclineInput.inputMode = 'decimal';
      inclineInput.placeholder = '%';
      inclineInput.value = set.incline != null ? set.incline : '';
      inclineInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimers[set.id + '_inc']);
        debounceTimers[set.id + '_inc'] = setTimeout(async () => {
          const v = parseFloat(e.target.value);
          workout = await updateSet(workout, set.id, { incline: isNaN(v) ? null : v });
        }, 250);
      });
      row.appendChild(inclineInput);

      // Resistance (level)
      const resistanceInput = document.createElement('input');
      resistanceInput.className = 'active-workout__set-input';
      resistanceInput.type = 'text';
      resistanceInput.inputMode = 'numeric';
      resistanceInput.placeholder = 'LVL';
      resistanceInput.value = set.resistance != null ? set.resistance : '';
      resistanceInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimers[set.id + '_res']);
        debounceTimers[set.id + '_res'] = setTimeout(async () => {
          const v = parseInt(e.target.value);
          workout = await updateSet(workout, set.id, { resistance: isNaN(v) ? null : v });
        }, 250);
      });
      row.appendChild(resistanceInput);
    } else {
      // Weight input
      const weightInput = document.createElement('input');
      weightInput.className = 'active-workout__set-input';
      weightInput.type = 'text';
      weightInput.inputMode = 'decimal';
      weightInput.placeholder = 'LB';
      weightInput.value = set.weight != null ? set.weight : '';
      weightInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimers[set.id]);
        debounceTimers[set.id] = setTimeout(async () => {
          const value = parseFloat(e.target.value);
          workout = await updateSet(workout, set.id, {
            weight: isNaN(value) ? null : value,
          });
        }, 250);
      });
      row.appendChild(weightInput);

      // Reps input
      const repsInput = document.createElement('input');
      repsInput.className = 'active-workout__set-input';
      repsInput.type = 'text';
      repsInput.inputMode = 'numeric';
      repsInput.placeholder = 'REPS';
      repsInput.value = set.reps != null ? set.reps : '';
      repsInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimers[set.id]);
        debounceTimers[set.id] = setTimeout(async () => {
          const value = parseInt(e.target.value);
          workout = await updateSet(workout, set.id, {
            reps: isNaN(value) ? null : value,
          });
        }, 250);
      });
      row.appendChild(repsInput);
    }

    // Completion checkbox toggle
    const checkBtn = document.createElement('button');
    checkBtn.className = `active-workout__check${set.isCompleted ? ' active-workout__check--done' : ''}`;
    checkBtn.setAttribute('aria-label', set.isCompleted ? 'Mark incomplete' : 'Mark complete');
    checkBtn.setAttribute('aria-pressed', set.isCompleted ? 'true' : 'false');
    checkBtn.textContent = set.isCompleted ? '✓' : '○';
    checkBtn.addEventListener('click', async () => {
      workout = await toggleSetCompleted(workout, set.id);
      await rerenderExercises();
    });
    row.appendChild(checkBtn);

    return row;
  }

  /**
   * Build header section with workout name and live timer
   */
  function buildHeader(currentWorkout) {
    const header = document.createElement('div');
    header.className = 'active-workout__header';

    const nameEl = document.createElement('h1');
    nameEl.className = 'active-workout__name';
    nameEl.textContent = currentWorkout.name.toUpperCase();
    header.appendChild(nameEl);

    const durationEl = document.createElement('div');
    durationEl.className = 'active-workout__duration';

    // Calculate initial elapsed time
    const elapsed = Math.floor(
      (Date.now() - new Date(currentWorkout.startedAt).getTime()) / 1000
    );
    durationEl.textContent = formatDuration(elapsed);

    // Start ticking every second
    timerInterval = setInterval(() => {
      const secs = Math.floor(
        (Date.now() - new Date(currentWorkout.startedAt).getTime()) / 1000
      );
      durationEl.textContent = formatDuration(secs);
    }, 1000);

    header.appendChild(durationEl);
    return header;
  }

  /**
   * Build the actions row with DISCARD and FINISH buttons
   */
  function buildActionsRow(onAction) {
    const row = document.createElement('div');
    row.className = 'active-workout__actions';

    const discardBtn = document.createElement('button');
    discardBtn.className = 'active-workout__discard';
    discardBtn.textContent = '← DISCARD';
    discardBtn.addEventListener('click', () => onAction('discard'));
    row.appendChild(discardBtn);

    return row;
  }

  // Initial render of exercises
  await rerenderExercises();
}
