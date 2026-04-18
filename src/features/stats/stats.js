/**
 * Phase 1D — Stats Feature (V2)
 * Renders the Stats tab with THIS YEAR totals, FREQUENCY averages, TOP EXERCISES, and PERSONAL RECORDS
 */

import { fetchAllWorkouts } from '../../core/store.js';

/**
 * Render the Stats view
 * @param {HTMLElement} appEl - The #app container
 * @returns {Promise<void>}
 */
export async function renderStats(appEl) {
  const workouts = await fetchAllWorkouts();
  const completed = workouts.filter(w => w.completedAt !== null);

  appEl.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'stats';

  // Header
  const header = document.createElement('div');
  header.className = 'stats__header';
  header.innerHTML = '<h1 class="stats__title">STATS</h1>';
  container.appendChild(header);

  if (completed.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'stats__empty';
    empty.innerHTML = `
      <p class="stats__empty-title">NO STATS YET</p>
      <p class="stats__empty-caption">COMPLETE YOUR FIRST WORKOUT TO SEE YOUR STATS</p>
    `;
    container.appendChild(empty);
    appEl.appendChild(container);
    return;
  }

  // Section 1: THIS YEAR
  container.appendChild(buildThisYearSection(completed));

  // Section 2: FREQUENCY
  container.appendChild(buildFrequencySection(completed));

  // Section 3: TOP EXERCISES
  container.appendChild(buildTopExercisesSection(completed));

  // Section 4: PERSONAL RECORDS
  container.appendChild(buildPersonalRecordsSection(completed));

  appEl.appendChild(container);
}

/**
 * Build the THIS YEAR section
 * Shows workout count and total duration for the current calendar year
 * @param {Array} completed - Array of completed workouts
 * @returns {HTMLElement}
 */
function buildThisYearSection(completed) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear + 1, 0, 1);

  // Filter workouts to current calendar year
  const yearWorkouts = completed.filter(w => {
    const completedDate = new Date(w.completedAt);
    return completedDate >= yearStart && completedDate < yearEnd;
  });

  // Count workouts
  const workoutCount = yearWorkouts.length;

  // Calculate total duration (in seconds)
  let totalSeconds = 0;
  yearWorkouts.forEach(w => {
    const started = new Date(w.startedAt);
    const finished = new Date(w.completedAt);
    const pausedMs = (w.totalPausedDuration || 0) * 1000;
    const durationMs = (finished - started) - pausedMs;
    const durationSeconds = Math.max(0, durationMs / 1000);
    totalSeconds += durationSeconds;
  });

  // Format as Xh Ym
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const durationStr = `${hours}h ${minutes}m`;

  const section = document.createElement('div');
  section.className = 'stats__section';

  const title = document.createElement('h2');
  title.className = 'stats__section-title';
  title.textContent = 'THIS YEAR';
  section.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'stats__grid-2col';

  // Workouts card
  const workoutsCard = document.createElement('div');
  workoutsCard.className = 'stats__card';
  workoutsCard.innerHTML = `
    <div class="stats__card-value">${workoutCount}</div>
    <div class="stats__card-label">WORKOUTS</div>
  `;
  grid.appendChild(workoutsCard);

  // Total time card
  const timeCard = document.createElement('div');
  timeCard.className = 'stats__card';
  timeCard.innerHTML = `
    <div class="stats__card-value">${durationStr}</div>
    <div class="stats__card-label">TOTAL TIME</div>
  `;
  grid.appendChild(timeCard);

  section.appendChild(grid);
  return section;
}

/**
 * Build the FREQUENCY section
 * Shows per-week and per-month averages
 * @param {Array} completed - Array of completed workouts
 * @returns {HTMLElement}
 */
function buildFrequencySection(completed) {
  if (completed.length === 0) {
    const section = document.createElement('div');
    section.className = 'stats__section';
    const title = document.createElement('h2');
    title.className = 'stats__section-title';
    title.textContent = 'FREQUENCY';
    section.appendChild(title);
    return section;
  }

  // Find earliest and latest workout dates
  const startedAtDates = completed.map(w => new Date(w.startedAt)).sort((a, b) => a - b);
  const firstWorkout = startedAtDates[0];
  const lastWorkout = startedAtDates[startedAtDates.length - 1];
  const today = new Date();

  // Calculate weeks since first workout
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const msSinceFirst = today - firstWorkout;
  const weeksSinceFirst = msSinceFirst / msPerWeek;
  const perWeek = completed.length / weeksSinceFirst;
  const perWeekStr = perWeek.toFixed(1);

  // Calculate months since first workout
  let monthsSinceFirst = 0;
  let tempDate = new Date(firstWorkout);
  while (tempDate < today) {
    tempDate.setMonth(tempDate.getMonth() + 1);
    monthsSinceFirst++;
  }
  // Adjust if we went one month too far
  if (tempDate > today) {
    monthsSinceFirst--;
  }
  // Ensure at least 1 month
  monthsSinceFirst = Math.max(1, monthsSinceFirst);
  const perMonth = completed.length / monthsSinceFirst;
  const perMonthStr = perMonth.toFixed(1);

  const section = document.createElement('div');
  section.className = 'stats__section';

  const title = document.createElement('h2');
  title.className = 'stats__section-title';
  title.textContent = 'FREQUENCY';
  section.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'stats__grid-2col';

  // Per week card
  const perWeekCard = document.createElement('div');
  perWeekCard.className = 'stats__card';
  perWeekCard.innerHTML = `
    <div class="stats__card-value">${perWeekStr}</div>
    <div class="stats__card-label">PER WEEK</div>
  `;
  grid.appendChild(perWeekCard);

  // Per month card
  const perMonthCard = document.createElement('div');
  perMonthCard.className = 'stats__card';
  perMonthCard.innerHTML = `
    <div class="stats__card-value">${perMonthStr}</div>
    <div class="stats__card-label">PER MONTH</div>
  `;
  grid.appendChild(perMonthCard);

  section.appendChild(grid);
  return section;
}

/**
 * Build the TOP EXERCISES section
 * Shows the 10 most-performed exercises ranked by workout count
 * @param {Array} completed - Array of completed workouts
 * @returns {HTMLElement}
 */
function buildTopExercisesSection(completed) {
  // Count distinct workouts per exercise name
  const exerciseWorkoutCount = new Map();
  completed.forEach(w => {
    const exerciseNames = new Set();
    w.exercises.forEach(we => {
      exerciseNames.add(we.exerciseName);
    });
    exerciseNames.forEach(name => {
      exerciseWorkoutCount.set(name, (exerciseWorkoutCount.get(name) || 0) + 1);
    });
  });

  // Sort by count descending and take top 10
  const sorted = Array.from(exerciseWorkoutCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const section = document.createElement('div');
  section.className = 'stats__section';

  const title = document.createElement('h2');
  title.className = 'stats__section-title';
  title.textContent = 'TOP EXERCISES';
  section.appendChild(title);

  if (sorted.length === 0) {
    const noData = document.createElement('div');
    noData.className = 'stats__no-data';
    noData.textContent = 'NO EXERCISE DATA';
    section.appendChild(noData);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'stats__exercise-list';

  sorted.forEach(([exerciseName, count]) => {
    const row = document.createElement('div');
    row.className = 'stats__exercise-row';
    row.innerHTML = `
      <div class="stats__exercise-name">${exerciseName.toUpperCase()}</div>
      <div class="stats__exercise-count">${count}×</div>
    `;
    list.appendChild(row);
  });

  section.appendChild(list);
  return section;
}

/**
 * Build the PERSONAL RECORDS section
 * Shows max weight/reps/duration per exercise, sorted alphabetically
 * @param {Array} completed - Array of completed workouts
 * @returns {HTMLElement}
 */
function buildPersonalRecordsSection(completed) {
  // Build map: exerciseName -> { measureBy, maxWeight, maxReps, maxDuration }
  const exercisePRs = new Map();

  completed.forEach(w => {
    w.exercises.forEach(we => {
      const exerciseName = we.exerciseName;
      const measureBy = we.measureBy || 'weight'; // Fallback to weight if missing

      if (!exercisePRs.has(exerciseName)) {
        exercisePRs.set(exerciseName, { measureBy, maxWeight: 0, maxReps: 0, maxDuration: 0 });
      }

      const pr = exercisePRs.get(exerciseName);

      we.sets.forEach(set => {
        // Use all sets (not just completed) to be permissive per spec
        if (set.weight !== null && set.weight !== undefined) {
          pr.maxWeight = Math.max(pr.maxWeight, set.weight);
        }
        if (set.reps !== null && set.reps !== undefined) {
          pr.maxReps = Math.max(pr.maxReps, set.reps);
        }
        if (set.duration !== null && set.duration !== undefined) {
          pr.maxDuration = Math.max(pr.maxDuration, set.duration);
        }
      });
    });
  });

  // Sort alphabetically by exercise name
  const sorted = Array.from(exercisePRs.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  const section = document.createElement('div');
  section.className = 'stats__section';

  const title = document.createElement('h2');
  title.className = 'stats__section-title';
  title.textContent = 'PERSONAL RECORDS';
  section.appendChild(title);

  if (sorted.length === 0) {
    const noData = document.createElement('div');
    noData.className = 'stats__no-data';
    noData.textContent = 'NO RECORDS YET';
    section.appendChild(noData);
    return section;
  }

  const list = document.createElement('div');
  list.className = 'stats__pr-list';

  sorted.forEach(([exerciseName, pr]) => {
    const row = document.createElement('div');
    row.className = 'stats__pr-row';

    let valueStr = '';
    if (pr.measureBy === 'weight' && pr.maxWeight > 0) {
      valueStr = `${pr.maxWeight} lb`;
    } else if (pr.measureBy === 'repsOnly' && pr.maxReps > 0) {
      valueStr = `${pr.maxReps} reps`;
    } else if (pr.measureBy === 'seconds' && pr.maxDuration > 0) {
      const mins = Math.floor(pr.maxDuration / 60);
      const secs = pr.maxDuration % 60;
      valueStr = `${mins}:${String(secs).padStart(2, '0')}`;
    }

    row.innerHTML = `
      <div class="stats__pr-name">${exerciseName.toUpperCase()}</div>
      <div class="stats__pr-value">${valueStr}</div>
    `;
    list.appendChild(row);
  });

  section.appendChild(list);
  return section;
}
