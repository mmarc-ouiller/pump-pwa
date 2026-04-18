/**
 * Phase 1B — Active Workout Feature (Rewrite)
 * Complete workout logging with editable name, pause/resume, set management,
 * collapse/expand exercises, swipe-delete sets, and planning mode flow.
 */

import {
  saveWorkout,
  startWorkout,
  pauseWorkout,
  resumeWorkout,
  completeWorkout,
  deleteWorkout,
  addSetTo,
  updateSet,
  toggleSetCompleted,
  deleteSet,
  addExerciseToWorkout,
  removeExerciseFromWorkout,
  reorderExercises,
  updateWorkoutName,
  markWorkoutAsEdited,
  updateTemplateFromWorkout,
  fetchAllWorkouts,
  fetchActiveWorkout,
} from '../../core/store.js';
import { formatDuration } from '../../core/format.js';
import { navigate } from '../../core/router.js';
import { renderButton } from '../../components/button.js';
import { openExercisePicker } from '../exercise-picker/exercise-picker.js';

// ============================================================================
// State Management
// ============================================================================

let currentWorkout = null;
let timerInterval = null;
const debounceTimers = {}; // setId → timer
let reorderMode = false;
let swipeState = {
  touchStartX: 0,
  touchStartY: 0,
  currentSetId: null,
  currentTranslateX: 0,
};

/**
 * Fetch a workout by ID from the database
 * Tries fetchAllWorkouts first, then falls back to fetchActiveWorkout
 */
async function fetchWorkoutById(id) {
  try {
    const allWorkouts = await fetchAllWorkouts();
    const found = allWorkouts.find((w) => w.id === id);
    if (found) return found;

    // Fallback to active workout
    const activeWorkout = await fetchActiveWorkout();
    if (activeWorkout && activeWorkout.id === id) return activeWorkout;

    return null;
  } catch (error) {
    console.error('fetchWorkoutById failed:', error);
    return null;
  }
}

/**
 * Main render function for the active workout screen
 * @param {HTMLElement} appEl
 * @param {{ id: string }} params
 */
export async function renderActiveWorkout(appEl, { id }) {
  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Load the workout
  currentWorkout = await fetchWorkoutById(id);
  if (!currentWorkout) {
    console.error(`Workout ${id} not found`);
    navigate('/');
    return;
  }

  reorderMode = false;
  appEl.innerHTML = '';

  // Main scaffold
  const scaffold = document.createElement('div');
  scaffold.className = 'active-workout';

  // Build header (name + timer + pause/resume)
  const header = buildHeader(currentWorkout);
  scaffold.appendChild(header);

  // Build exercises container (scrollable)
  const exercisesContainer = document.createElement('div');
  exercisesContainer.className = 'active-workout__exercises';
  scaffold.appendChild(exercisesContainer);

  appEl.appendChild(scaffold);

  // Setup cleanup on visibility change
  setupAutoDelete();

  // Initial render
  await rerenderExercises(exercisesContainer);
}

/**
 * Setup auto-delete of empty planning workouts when user navigates away
 */
function setupAutoDelete() {
  const handleVisibilityChange = async () => {
    if (!currentWorkout || currentWorkout.startedAt !== null) return;
    if (currentWorkout.hasBeenEdited) return;

    // Planning mode, not edited → auto-delete on unmount
    if (document.hidden || window.location.hash !== `#/workout/${currentWorkout.id}`) {
      try {
        await deleteWorkout(currentWorkout);
      } catch (e) {
        console.warn('Auto-delete planning workout failed:', e);
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleVisibilityChange);
}

/**
 * Build the header section with name input, timer, and pause/resume
 */
function buildHeader(workout) {
  const header = document.createElement('div');
  header.className = 'active-workout__header';

  // Workout name input (editable)
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'active-workout__name-input';
  nameInput.value = workout.name;
  nameInput.placeholder = 'Workout name';

  const updateName = async () => {
    const newName = nameInput.value.trim() || workout.name;
    if (newName !== workout.name) {
      currentWorkout = await updateWorkoutName(workout, newName);
      nameInput.value = currentWorkout.name;
      if (workout.startedAt === null) {
        currentWorkout = await markWorkoutAsEdited(currentWorkout);
      }
    }
  };

  nameInput.addEventListener('blur', updateName);
  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      nameInput.blur();
    }
  });

  header.appendChild(nameInput);

  // Timer display + pause/resume controls row
  const timerRow = document.createElement('div');
  timerRow.className = 'active-workout__timer-row';

  const timerDisplay = document.createElement('div');
  timerDisplay.className = 'active-workout__timer';
  header.appendChild(timerRow);

  // Update timer display
  function updateTimerDisplay() {
    if (workout.startedAt === null) {
      timerDisplay.textContent = 'PLANNING';
    } else if (workout.pausedAt !== null) {
      // Paused: show the frozen elapsed time
      const elapsedMs =
        new Date(workout.pausedAt).getTime() -
        new Date(workout.startedAt).getTime() -
        workout.totalPausedDuration * 1000;
      timerDisplay.textContent = formatDuration(Math.floor(elapsedMs / 1000));
    } else {
      // Active: compute live elapsed
      const elapsedMs =
        Date.now() -
        new Date(workout.startedAt).getTime() -
        workout.totalPausedDuration * 1000;
      timerDisplay.textContent = formatDuration(Math.floor(elapsedMs / 1000));
    }
  }

  updateTimerDisplay();
  timerRow.appendChild(timerDisplay);

  // Pause / Resume button (only show if not planning)
  if (workout.startedAt !== null) {
    const togglePauseBtn = document.createElement('button');
    togglePauseBtn.className = 'active-workout__pause-btn';

    const updatePauseBtn = () => {
      if (currentWorkout.pausedAt !== null) {
        togglePauseBtn.textContent = 'RESUME';
        togglePauseBtn.classList.add('active-workout__pause-btn--paused');
      } else {
        togglePauseBtn.textContent = 'PAUSE';
        togglePauseBtn.classList.remove('active-workout__pause-btn--paused');
      }
    };

    updatePauseBtn();

    togglePauseBtn.addEventListener('click', async () => {
      if (currentWorkout.pausedAt !== null) {
        // Currently paused, resume
        currentWorkout = await resumeWorkout(currentWorkout);
      } else {
        // Currently active, pause
        currentWorkout = await pauseWorkout(currentWorkout);
      }
      updatePauseBtn();
      updateTimerDisplay();
    });

    timerRow.appendChild(togglePauseBtn);
  }

  // Start live timer (only if active and not paused)
  if (timerInterval) clearInterval(timerInterval);
  if (workout.startedAt !== null && workout.pausedAt === null) {
    timerInterval = setInterval(updateTimerDisplay, 1000);
  }

  return header;
}

/**
 * Re-render only the exercises section (preserves input focus)
 */
async function rerenderExercises(exercisesContainer) {
  exercisesContainer.innerHTML = '';

  // Render each exercise card
  for (let exIdx = 0; exIdx < currentWorkout.exercises.length; exIdx++) {
    const workoutExercise = currentWorkout.exercises[exIdx];
    const card = buildExerciseCard(workoutExercise, exIdx);
    exercisesContainer.appendChild(card);
  }

  // Reorder mode toggle button
  const reorderToggle = document.createElement('button');
  reorderToggle.className = 'active-workout__reorder-toggle';
  reorderToggle.textContent = reorderMode ? 'DONE REORDERING' : 'REORDER EXERCISES';
  reorderToggle.addEventListener('click', async () => {
    reorderMode = !reorderMode;
    await rerenderExercises(exercisesContainer);
  });
  exercisesContainer.appendChild(reorderToggle);

  // Add Exercise button
  const addExBtn = renderButton({
    title: '+ ADD EXERCISE',
    variant: 'outline',
  });
  addExBtn.className += ' active-workout__add-exercise';
  addExBtn.addEventListener('click', () => {
    openExercisePicker({
      onSelect: async (exercises) => {
        // exercises is now an array per Phase 1E contract
        if (Array.isArray(exercises)) {
          for (const ex of exercises) {
            currentWorkout = await addExerciseToWorkout(currentWorkout, ex);
          }
        } else {
          // Fallback for single exercise (in case picker not yet updated)
          currentWorkout = await addExerciseToWorkout(currentWorkout, exercises);
        }
        await rerenderExercises(exercisesContainer);
      },
    });
  });
  exercisesContainer.appendChild(addExBtn);

  // Planning vs Active mode buttons
  if (currentWorkout.startedAt === null) {
    // Planning mode: show START button
    const startBtn = renderButton({
      title: 'START WORKOUT',
      variant: 'solid',
    });
    startBtn.className += ' active-workout__start';
    startBtn.addEventListener('click', async () => {
      currentWorkout = await startWorkout(currentWorkout);
      // Trigger countdown animation (will be imported in Phase 1G)
      // For now, just re-render
      const scaffold = document.querySelector('.active-workout');
      scaffold.innerHTML = '';
      scaffold.appendChild(buildHeader(currentWorkout));
      const newContainer = document.createElement('div');
      newContainer.className = 'active-workout__exercises';
      scaffold.appendChild(newContainer);
      await rerenderExercises(newContainer);
    });
    exercisesContainer.appendChild(startBtn);

    // Save to template button (if created from template and edited)
    if (currentWorkout.templateId && currentWorkout.hasBeenEdited) {
      const saveBtn = renderButton({
        title: 'SAVE TO TEMPLATE',
        variant: 'outline',
      });
      saveBtn.className += ' active-workout__save-template';
      saveBtn.addEventListener('click', async () => {
        await updateTemplateFromWorkout(currentWorkout);
        // Show brief toast
        const toast = document.createElement('div');
        toast.className = 'active-workout__toast';
        toast.textContent = 'SAVED';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      });
      exercisesContainer.appendChild(saveBtn);
    }
  } else {
    // Active mode: show FINISH button
    const finishBtn = renderButton({
      title: 'FINISH WORKOUT',
      variant: 'solid',
    });
    finishBtn.className += ' active-workout__finish';
    finishBtn.addEventListener('click', async () => {
      showFinishConfirmation(exercisesContainer);
    });
    exercisesContainer.appendChild(finishBtn);
  }
}

/**
 * Show finish confirmation sheet
 */
function showFinishConfirmation(parentContainer) {
  // Build confirmation sheet
  const sheet = document.createElement('div');
  sheet.className = 'active-workout__confirmation-sheet';

  const backdrop = document.createElement('div');
  backdrop.className = 'active-workout__sheet-backdrop';
  backdrop.addEventListener('click', () => sheet.remove());

  const sheetContent = document.createElement('div');
  sheetContent.className = 'active-workout__sheet-content';

  // Summary text
  const summary = document.createElement('div');
  summary.className = 'active-workout__sheet-summary';

  const elapsedMs =
    (currentWorkout.pausedAt !== null
      ? new Date(currentWorkout.pausedAt).getTime()
      : Date.now()) -
    new Date(currentWorkout.startedAt).getTime() -
    currentWorkout.totalPausedDuration * 1000;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  const completedSets = currentWorkout.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length,
    0
  );
  const totalSets = currentWorkout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  summary.innerHTML = `
    <p><strong>Duration</strong><br>${formatDuration(elapsedSeconds)}</p>
    <p><strong>Exercises</strong><br>${currentWorkout.exercises.length}</p>
    <p><strong>Completed Sets</strong><br>${completedSets} / ${totalSets}</p>
  `;
  sheetContent.appendChild(summary);

  // Buttons
  const buttonRow = document.createElement('div');
  buttonRow.className = 'active-workout__sheet-buttons';

  const continueBtn = renderButton({
    title: 'CONTINUE WORKOUT',
    variant: 'outline',
  });
  continueBtn.addEventListener('click', () => sheet.remove());
  buttonRow.appendChild(continueBtn);

  const finishBtn = renderButton({
    title: 'FINISH',
    variant: 'solid',
  });
  finishBtn.addEventListener('click', async () => {
    sheet.remove();
    if (timerInterval) clearInterval(timerInterval);
    currentWorkout = await completeWorkout(currentWorkout);
    navigate(`/workout/${currentWorkout.id}/summary`);
  });
  buttonRow.appendChild(finishBtn);

  sheetContent.appendChild(buttonRow);

  const container = document.createElement('div');
  container.className = 'active-workout__sheet-overlay';
  container.appendChild(backdrop);
  container.appendChild(sheetContent);

  document.body.appendChild(container);
}

/**
 * Build a single exercise card
 */
function buildExerciseCard(workoutExercise, exIdx) {
  const card = document.createElement('div');
  card.className = 'active-workout__exercise-card';

  // Header row: exercise name, collapse/expand chevron, remove button, reorder buttons
  const header = document.createElement('div');
  header.className = 'active-workout__exercise-header';

  const exName = document.createElement('span');
  exName.className = 'active-workout__exercise-name';
  exName.textContent = workoutExercise.exerciseName.toUpperCase();
  header.appendChild(exName);

  // Collapse/expand chevron (if not in reorder mode)
  let isCollapsed = false;
  if (!reorderMode) {
    const chevronBtn = document.createElement('button');
    chevronBtn.className = 'active-workout__chevron';
    chevronBtn.textContent = '▼';
    chevronBtn.setAttribute('aria-label', 'Collapse/expand exercise');

    const toggleCollapse = () => {
      isCollapsed = !isCollapsed;
      chevronBtn.textContent = isCollapsed ? '▶' : '▼';
      const setsContainer = card.querySelector('.active-workout__sets-container');
      if (setsContainer) {
        setsContainer.style.display = isCollapsed ? 'none' : 'flex';
      }
    };

    chevronBtn.addEventListener('click', toggleCollapse);
    header.appendChild(chevronBtn);
  }

  // Reorder buttons (only in reorder mode)
  if (reorderMode) {
    if (exIdx > 0) {
      const upBtn = document.createElement('button');
      upBtn.className = 'active-workout__reorder-up';
      upBtn.textContent = '▲';
      upBtn.addEventListener('click', async () => {
        const newOrder = [...currentWorkout.exercises];
        [newOrder[exIdx], newOrder[exIdx - 1]] = [newOrder[exIdx - 1], newOrder[exIdx]];
        currentWorkout = await reorderExercises(currentWorkout, newOrder);
        const container = document.querySelector('.active-workout__exercises');
        await rerenderExercises(container);
      });
      header.appendChild(upBtn);
    }

    if (exIdx < currentWorkout.exercises.length - 1) {
      const downBtn = document.createElement('button');
      downBtn.className = 'active-workout__reorder-down';
      downBtn.textContent = '▼';
      downBtn.addEventListener('click', async () => {
        const newOrder = [...currentWorkout.exercises];
        [newOrder[exIdx], newOrder[exIdx + 1]] = [newOrder[exIdx + 1], newOrder[exIdx]];
        currentWorkout = await reorderExercises(currentWorkout, newOrder);
        const container = document.querySelector('.active-workout__exercises');
        await rerenderExercises(container);
      });
      header.appendChild(downBtn);
    }
  }

  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.className = 'active-workout__remove-btn';
  removeBtn.textContent = '✕';
  removeBtn.setAttribute('aria-label', `Remove ${workoutExercise.exerciseName}`);
  removeBtn.addEventListener('click', async () => {
    if (window.confirm(`Remove ${workoutExercise.exerciseName}?`)) {
      currentWorkout = await removeExerciseFromWorkout(currentWorkout, workoutExercise.id);
      const container = document.querySelector('.active-workout__exercises');
      await rerenderExercises(container);
    }
  });
  header.appendChild(removeBtn);

  card.appendChild(header);

  // Sets container (collapsible)
  const setsContainer = document.createElement('div');
  setsContainer.className = 'active-workout__sets-container';
  setsContainer.style.display = isCollapsed ? 'none' : 'flex';

  // Determine layout based on measureBy
  const measureBy = workoutExercise.measureBy;
  const layoutClass = `set-row--${mapMeasureByToClass(measureBy)}`;

  // Column headers
  const colHeaders = document.createElement('div');
  colHeaders.className = `active-workout__col-headers ${layoutClass}`;
  colHeaders.innerHTML = getColHeadersHTML(measureBy);
  setsContainer.appendChild(colHeaders);

  // Render each set
  for (let setIdx = 0; setIdx < workoutExercise.sets.length; setIdx++) {
    const set = workoutExercise.sets[setIdx];
    const setRow = buildSetRow(set, setIdx + 1, workoutExercise, measureBy);
    setsContainer.appendChild(setRow);
  }

  // Add set button
  const addSetBtn = renderButton({
    title: '+ ADD SET',
    variant: 'outline',
  });
  addSetBtn.className += ' active-workout__add-set';
  addSetBtn.addEventListener('click', async () => {
    currentWorkout = await addSetTo(currentWorkout, workoutExercise.id);
    const container = document.querySelector('.active-workout__exercises');
    await rerenderExercises(container);
  });
  setsContainer.appendChild(addSetBtn);

  card.appendChild(setsContainer);

  return card;
}

/**
 * Map measureBy to CSS class suffix
 */
function mapMeasureByToClass(measureBy) {
  switch (measureBy) {
    case 'weight':
      return 'weight';
    case 'repsOnly':
      return 'reps-only';
    case 'seconds':
      return 'seconds';
    default:
      return 'weight';
  }
}

/**
 * Get column headers HTML based on measureBy
 */
function getColHeadersHTML(measureBy) {
  switch (measureBy) {
    case 'weight':
      return '<span>SET</span><span>WEIGHT</span><span>REPS</span><span></span>';
    case 'repsOnly':
      return '<span>SET</span><span>REPS</span><span></span>';
    case 'seconds':
      return '<span>SET</span><span>DURATION</span><span></span>';
    default:
      return '<span>SET</span><span>WEIGHT</span><span>REPS</span><span></span>';
  }
}

/**
 * Build a single set row with swipe-to-delete support
 */
function buildSetRow(set, setIndex, workoutExercise, measureBy) {
  const row = document.createElement('div');
  row.className = `set-row set-row--${mapMeasureByToClass(measureBy)}${
    set.isCompleted ? ' set-row--completed' : ''
  }`;

  // Swipe wrapper for touch interactions
  const swipeWrapper = document.createElement('div');
  swipeWrapper.className = 'set-row__swipe-wrapper';

  // Index
  const indexEl = document.createElement('span');
  indexEl.className = 'active-workout__set-index';
  indexEl.textContent = setIndex;
  swipeWrapper.appendChild(indexEl);

  // Input fields based on measureBy
  if (measureBy === 'weight') {
    // Weight
    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.className = 'active-workout__set-input';
    weightInput.inputMode = 'decimal';
    weightInput.placeholder = 'lb';
    weightInput.value = set.weight != null ? set.weight : '';
    weightInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimers[set.id + '_w']);
      debounceTimers[set.id + '_w'] = setTimeout(async () => {
        const v = parseFloat(e.target.value);
        currentWorkout = await updateSet(currentWorkout, set.id, {
          weight: isNaN(v) ? null : v,
        });
      }, 250);
    });
    swipeWrapper.appendChild(weightInput);

    // Reps
    const repsInput = document.createElement('input');
    repsInput.type = 'number';
    repsInput.className = 'active-workout__set-input';
    repsInput.inputMode = 'numeric';
    repsInput.placeholder = 'reps';
    repsInput.value = set.reps != null ? set.reps : '';
    repsInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimers[set.id + '_r']);
      debounceTimers[set.id + '_r'] = setTimeout(async () => {
        const v = parseInt(e.target.value);
        currentWorkout = await updateSet(currentWorkout, set.id, {
          reps: isNaN(v) ? null : v,
        });
      }, 250);
    });
    swipeWrapper.appendChild(repsInput);
  } else if (measureBy === 'repsOnly') {
    // Reps only
    const repsInput = document.createElement('input');
    repsInput.type = 'number';
    repsInput.className = 'active-workout__set-input';
    repsInput.inputMode = 'numeric';
    repsInput.placeholder = 'reps';
    repsInput.value = set.reps != null ? set.reps : '';
    repsInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimers[set.id + '_r']);
      debounceTimers[set.id + '_r'] = setTimeout(async () => {
        const v = parseInt(e.target.value);
        currentWorkout = await updateSet(currentWorkout, set.id, {
          reps: isNaN(v) ? null : v,
        });
      }, 250);
    });
    swipeWrapper.appendChild(repsInput);
  } else if (measureBy === 'seconds') {
    // Duration
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.className = 'active-workout__set-input';
    durationInput.inputMode = 'decimal';
    durationInput.placeholder = 'seconds';
    durationInput.value = set.duration != null ? set.duration : '';
    durationInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimers[set.id + '_d']);
      debounceTimers[set.id + '_d'] = setTimeout(async () => {
        const v = parseFloat(e.target.value);
        currentWorkout = await updateSet(currentWorkout, set.id, {
          duration: isNaN(v) ? null : v,
        });
      }, 250);
    });
    swipeWrapper.appendChild(durationInput);
  }

  // Checkmark button
  const checkBtn = document.createElement('button');
  checkBtn.className = `set-row__check${set.isCompleted ? ' set-row--completed' : ''}`;
  checkBtn.setAttribute('aria-label', set.isCompleted ? 'Mark incomplete' : 'Mark complete');
  checkBtn.setAttribute('aria-pressed', set.isCompleted ? 'true' : 'false');
  checkBtn.textContent = set.isCompleted ? '✓' : '○';
  checkBtn.addEventListener('click', async () => {
    currentWorkout = await toggleSetCompleted(currentWorkout, set.id);
    const container = document.querySelector('.active-workout__exercises');
    await rerenderExercises(container);
  });
  swipeWrapper.appendChild(checkBtn);

  row.appendChild(swipeWrapper);

  // Setup swipe-to-delete
  setupSwipeDelete(row, set, workoutExercise);

  return row;
}

/**
 * Setup swipe-to-delete on a set row
 */
function setupSwipeDelete(rowEl, set, workoutExercise) {
  let touchStartX = 0;
  let touchStartY = 0;
  let currentX = 0;
  let isDragging = false;

  rowEl.addEventListener('pointerdown', (e) => {
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    isDragging = false;
    currentX = 0;
  });

  rowEl.addEventListener('pointermove', (e) => {
    if (!touchStartX) return;

    const deltaX = e.clientX - touchStartX;
    const deltaY = e.clientY - touchStartY;

    // Only allow horizontal swipe (ignore vertical scrolls)
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    isDragging = true;

    // Only allow swipe left (negative deltaX)
    if (deltaX >= 0) {
      return;
    }

    currentX = Math.max(-200, deltaX); // Max 200px swipe
    const swipeWrapper = rowEl.querySelector('.set-row__swipe-wrapper');
    if (swipeWrapper) {
      swipeWrapper.style.transform = `translateX(${currentX}px)`;
    }

    // Update visual feedback
    const absX = Math.abs(currentX);
    if (absX >= 140) {
      rowEl.classList.add('set-row--swipe-threshold');
    } else if (absX >= 100) {
      rowEl.classList.add('set-row--swipe-text');
      rowEl.classList.remove('set-row--swipe-threshold');
    } else if (absX >= 40) {
      rowEl.classList.add('set-row--swipe-icon');
      rowEl.classList.remove('set-row--swipe-text', 'set-row--swipe-threshold');
    } else {
      rowEl.classList.remove('set-row--swipe-icon', 'set-row--swipe-text', 'set-row--swipe-threshold');
    }
  });

  rowEl.addEventListener('pointerup', async (e) => {
    const absX = Math.abs(currentX);

    if (isDragging && absX >= 140) {
      // Trigger delete
      const swipeWrapper = rowEl.querySelector('.set-row__swipe-wrapper');
      if (swipeWrapper) {
        swipeWrapper.style.transform = 'translateX(0)';
      }
      currentWorkout = await deleteSet(currentWorkout, workoutExercise.id, set.id);
      const container = document.querySelector('.active-workout__exercises');
      await rerenderExercises(container);
    } else {
      // Animate back to start
      const swipeWrapper = rowEl.querySelector('.set-row__swipe-wrapper');
      if (swipeWrapper) {
        swipeWrapper.style.transform = 'translateX(0)';
      }
      rowEl.classList.remove('set-row--swipe-icon', 'set-row--swipe-text', 'set-row--swipe-threshold');
    }

    touchStartX = 0;
    touchStartY = 0;
    currentX = 0;
    isDragging = false;
  });

  rowEl.addEventListener('pointercancel', (e) => {
    const swipeWrapper = rowEl.querySelector('.set-row__swipe-wrapper');
    if (swipeWrapper) {
      swipeWrapper.style.transform = 'translateX(0)';
    }
    rowEl.classList.remove('set-row--swipe-icon', 'set-row--swipe-text', 'set-row--swipe-threshold');
    touchStartX = 0;
    touchStartY = 0;
    currentX = 0;
    isDragging = false;
  });
}
