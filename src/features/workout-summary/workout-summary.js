/**
 * Phase 1G — Workout Summary Screen
 * Route: /workout/:id/summary
 * Shows exclamation phrase, stats, per-exercise table with PR detection
 */

import { fetchAllWorkouts } from '../../core/store.js';
import { navigate } from '../../core/router.js';
import { formatDuration } from '../../core/format.js';

const PHRASES = [
  "ABSOLUTELY CRUSHED IT.",
  "BEAST MODE: ACTIVATED.",
  "GAINS UNLOCKED.",
  "THAT'S HOW IT'S DONE.",
  "ANOTHER ONE IN THE BOOKS.",
  "LEGENDARY SESSION.",
  "NOTHING CAN STOP YOU NOW.",
  "THE WORK SPEAKS FOR ITSELF.",
  "STRONGER EVERY DAY.",
  "YOU SHOWED UP. THAT'S EVERYTHING.",
  "BUILT DIFFERENT.",
  "MAXIMUM EFFORT DELIVERED.",
  "THAT'S WHAT CHAMPIONS DO.",
  "PROGRESS LOADING...",
  "OUTWORKED YOURSELF AGAIN.",
  "BODY: COMPLETE. MIND: UNBREAKABLE.",
  "REST EARNED. RESULTS COMING.",
  "LEVEL UP.",
  "PURE DEDICATION.",
];

/**
 * Render the workout summary screen
 * @param {HTMLElement} appEl
 * @param {{ id: string }} options
 * @returns {Promise<void>}
 */
export async function renderWorkoutSummary(appEl, { id }) {
  // Fetch all workouts and find the one with this id
  const allWorkouts = await fetchAllWorkouts();
  const workout = allWorkouts.find(w => w.id === id);

  // Validate: must exist and be completed
  if (!workout || !workout.completedAt) {
    navigate('/history');
    return;
  }

  // Pick a random exclamation phrase
  const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];

  // Calculate duration (excluding paused time)
  const startTime = new Date(workout.startedAt).getTime();
  const endTime = new Date(workout.completedAt).getTime();
  const elapsedMs = endTime - startTime;
  const pausedMs = (workout.totalPausedDuration || 0) * 1000;
  const activeMs = elapsedMs - pausedMs;
  const activeSecs = Math.floor(activeMs / 1000);

  // Count exercises and completed sets
  const exerciseCount = workout.exercises?.length || 0;
  let completedSetCount = 0;
  if (workout.exercises) {
    workout.exercises.forEach(ex => {
      if (ex.sets) {
        completedSetCount += ex.sets.filter(s => s.isCompleted).length;
      }
    });
  }

  // Build the view
  const container = document.createElement('div');
  container.className = 'workout-summary';

  // Exclamation phrase
  const phraseEl = document.createElement('div');
  phraseEl.className = 'workout-summary__phrase';
  phraseEl.textContent = phrase;
  container.appendChild(phraseEl);

  // Stats section
  const statsEl = document.createElement('div');
  statsEl.className = 'workout-summary__stats';

  const durationEl = document.createElement('div');
  durationEl.className = 'workout-summary__stat';
  durationEl.innerHTML = `<span class="workout-summary__stat-label">DURATION</span><span class="workout-summary__stat-value">${formatDuration(activeSecs)}</span>`;
  statsEl.appendChild(durationEl);

  const exercisesEl = document.createElement('div');
  exercisesEl.className = 'workout-summary__stat';
  exercisesEl.innerHTML = `<span class="workout-summary__stat-label">EXERCISES</span><span class="workout-summary__stat-value">${exerciseCount}</span>`;
  statsEl.appendChild(exercisesEl);

  const setsEl = document.createElement('div');
  setsEl.className = 'workout-summary__stat';
  setsEl.innerHTML = `<span class="workout-summary__stat-label">COMPLETED SETS</span><span class="workout-summary__stat-value">${completedSetCount}</span>`;
  statsEl.appendChild(setsEl);

  container.appendChild(statsEl);

  // Per-exercise table
  const tableEl = document.createElement('div');
  tableEl.className = 'workout-summary__table';

  if (workout.exercises && workout.exercises.length > 0) {
    // Fetch all completed workouts that occurred before this one to calculate PRs
    const priorWorkouts = allWorkouts.filter(
      w => w.completedAt && new Date(w.completedAt) < new Date(workout.completedAt)
    );

    // Build prior values map: exerciseId -> { maxWeight, maxReps, maxDuration }
    const priorBests = {};
    priorWorkouts.forEach(priorWo => {
      if (priorWo.exercises) {
        priorWo.exercises.forEach(priorEx => {
          if (!priorBests[priorEx.exerciseId]) {
            priorBests[priorEx.exerciseId] = { maxWeight: 0, maxReps: 0, maxDuration: 0 };
          }
          if (priorEx.sets) {
            priorEx.sets.forEach(set => {
              if (set.isCompleted) {
                if (set.weight !== null && set.weight > (priorBests[priorEx.exerciseId].maxWeight || 0)) {
                  priorBests[priorEx.exerciseId].maxWeight = set.weight;
                }
                if (set.reps !== null && set.reps > (priorBests[priorEx.exerciseId].maxReps || 0)) {
                  priorBests[priorEx.exerciseId].maxReps = set.reps;
                }
                if (set.duration !== null && set.duration > (priorBests[priorEx.exerciseId].maxDuration || 0)) {
                  priorBests[priorEx.exerciseId].maxDuration = set.duration;
                }
              }
            });
          }
        });
      }
    });

    // Render each exercise
    workout.exercises.forEach(exercise => {
      const exerciseSection = document.createElement('div');
      exerciseSection.className = 'workout-summary__exercise';

      const exerciseName = document.createElement('h3');
      exerciseName.className = 'workout-summary__exercise-name';
      exerciseName.textContent = exercise.exerciseName;
      exerciseSection.appendChild(exerciseName);

      const setsTable = document.createElement('div');
      setsTable.className = 'workout-summary__sets-table';

      const headerRow = document.createElement('div');
      headerRow.className = 'workout-summary__set-row workout-summary__set-row--header';

      const setCol = document.createElement('div');
      setCol.className = 'workout-summary__set-col';
      setCol.textContent = 'SET';
      headerRow.appendChild(setCol);

      // Render columns based on measureBy
      if (exercise.measureBy === 'weight') {
        const weightCol = document.createElement('div');
        weightCol.className = 'workout-summary__set-col';
        weightCol.textContent = 'WEIGHT';
        headerRow.appendChild(weightCol);

        const repsCol = document.createElement('div');
        repsCol.className = 'workout-summary__set-col';
        repsCol.textContent = 'REPS';
        headerRow.appendChild(repsCol);
      } else if (exercise.measureBy === 'repsOnly') {
        const repsCol = document.createElement('div');
        repsCol.className = 'workout-summary__set-col';
        repsCol.textContent = 'REPS';
        headerRow.appendChild(repsCol);
      } else if (exercise.measureBy === 'seconds') {
        const durationCol = document.createElement('div');
        durationCol.className = 'workout-summary__set-col';
        durationCol.textContent = 'DURATION';
        headerRow.appendChild(durationCol);
      }

      const checkCol = document.createElement('div');
      checkCol.className = 'workout-summary__set-col';
      checkCol.textContent = '✓';
      headerRow.appendChild(checkCol);

      setsTable.appendChild(headerRow);

      // Render set rows
      if (exercise.sets && exercise.sets.length > 0) {
        exercise.sets.forEach((set, idx) => {
          const row = document.createElement('div');
          row.className = 'workout-summary__set-row';

          const setNum = document.createElement('div');
          setNum.className = 'workout-summary__set-col';
          setNum.textContent = (idx + 1).toString();
          row.appendChild(setNum);

          // Value columns based on measureBy
          if (exercise.measureBy === 'weight') {
            const weightVal = document.createElement('div');
            weightVal.className = 'workout-summary__set-col';
            const weight = set.weight !== null ? `${Math.round(set.weight)}` : '—';
            weightVal.textContent = weight;

            // Check for weight PR
            const priorBest = priorBests[exercise.exerciseId];
            const isPR = set.isCompleted && set.weight && priorBest && set.weight > priorBest.maxWeight;
            if (isPR) {
              weightVal.classList.add('workout-summary__set-col--pr');
              weightVal.textContent = `${weight} 🏆`;
            }
            row.appendChild(weightVal);

            const repsVal = document.createElement('div');
            repsVal.className = 'workout-summary__set-col';
            repsVal.textContent = set.reps !== null ? set.reps.toString() : '—';
            row.appendChild(repsVal);
          } else if (exercise.measureBy === 'repsOnly') {
            const repsVal = document.createElement('div');
            repsVal.className = 'workout-summary__set-col';
            const reps = set.reps !== null ? set.reps.toString() : '—';
            repsVal.textContent = reps;

            // Check for reps PR
            const priorBest = priorBests[exercise.exerciseId];
            const isPR = set.isCompleted && set.reps && priorBest && set.reps > priorBest.maxReps;
            if (isPR) {
              repsVal.classList.add('workout-summary__set-col--pr');
              repsVal.textContent = `${reps} 🏆`;
            }
            row.appendChild(repsVal);
          } else if (exercise.measureBy === 'seconds') {
            const durationVal = document.createElement('div');
            durationVal.className = 'workout-summary__set-col';
            const duration = set.duration !== null ? `${set.duration}s` : '—';
            durationVal.textContent = duration;

            // Check for duration PR
            const priorBest = priorBests[exercise.exerciseId];
            const isPR = set.isCompleted && set.duration && priorBest && set.duration > priorBest.maxDuration;
            if (isPR) {
              durationVal.classList.add('workout-summary__set-col--pr');
              durationVal.textContent = `${duration} 🏆`;
            }
            row.appendChild(durationVal);
          }

          const checkVal = document.createElement('div');
          checkVal.className = 'workout-summary__set-col';
          checkVal.textContent = set.isCompleted ? '✓' : '○';
          row.appendChild(checkVal);

          setsTable.appendChild(row);
        });
      }

      exerciseSection.appendChild(setsTable);
      tableEl.appendChild(exerciseSection);
    });
  }

  container.appendChild(tableEl);

  // Done button
  const doneBtn = document.createElement('button');
  doneBtn.className = 'workout-summary__done-btn';
  doneBtn.textContent = 'DONE';
  doneBtn.addEventListener('click', () => {
    navigate('/history');
  });
  container.appendChild(doneBtn);

  // Render into appEl
  appEl.innerHTML = '';
  appEl.appendChild(container);
}
