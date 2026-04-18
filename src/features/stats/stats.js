/**
 * Phase 1A — Stats Feature
 * Renders the Stats tab with streak counter, weekly volume, and weight progression
 */

import { fetchAllWorkouts } from '../../core/store.js';

/**
 * Render the Stats view
 * @param {HTMLElement} appEl - The #app container
 * @returns {Promise<void>}
 */
export async function renderStats(appEl) {
  const workouts = await fetchAllWorkouts();
  const completed = workouts.filter(w => w.completedAt);

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
      <p class="stats__empty-title">NO DATA YET</p>
      <p class="stats__empty-caption">Complete your first workout to see stats.</p>
    `;
    container.appendChild(empty);
    appEl.appendChild(container);
    return;
  }

  // Section 1: Streak
  container.appendChild(buildStreakSection(completed));

  // Section 2: Weekly Volume
  container.appendChild(buildVolumeSection(completed));

  // Section 3: Weight Progression
  container.appendChild(buildProgressionSection(completed));

  appEl.appendChild(container);
}

/**
 * Build the Streak section
 * @param {Array} completed - Array of completed workouts
 * @returns {HTMLElement}
 */
function buildStreakSection(completed) {
  // Get unique workout days (YYYY-MM-DD strings), sorted ascending
  const days = [...new Set(
    completed.map(w => w.completedAt.slice(0, 10))
  )].sort();

  // Current streak: count consecutive days backwards from today
  let currentStreak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let checkDate = today;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i] === checkDate) {
      currentStreak++;
      // move checkDate back one day
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().slice(0, 10);
    } else if (days[i] < checkDate) {
      break; // gap found
    }
  }

  // Best streak: longest consecutive run
  let bestStreak = 1, runStreak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      runStreak++;
      bestStreak = Math.max(bestStreak, runStreak);
    } else {
      runStreak = 1;
    }
  }

  const section = document.createElement('div');
  section.className = 'stats__section';
  section.innerHTML = `
    <h2 class="stats__section-title">STREAK</h2>
    <div class="stats__streak-row">
      <div class="stats__streak-block">
        <div class="stats__streak-value">${currentStreak}</div>
        <div class="stats__streak-label">CURRENT</div>
      </div>
      <div class="stats__streak-block">
        <div class="stats__streak-value">${bestStreak}</div>
        <div class="stats__streak-label">BEST</div>
      </div>
      <div class="stats__streak-block">
        <div class="stats__streak-value">${completed.length}</div>
        <div class="stats__streak-label">TOTAL</div>
      </div>
    </div>
  `;
  return section;
}

/**
 * Build the Weekly Volume section
 * Volume = sum of (weight × reps) for all completed strength sets in the workout
 * @param {Array} completed - Array of completed workouts
 * @returns {HTMLElement}
 */
function buildVolumeSection(completed) {
  // Group by ISO week (YYYY-WW)
  function getWeekKey(isoDate) {
    const d = new Date(isoDate);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  const volumeByWeek = {};
  completed.forEach(w => {
    const key = getWeekKey(w.completedAt);
    let vol = 0;
    w.exercises.forEach(we => {
      we.sets.forEach(s => {
        if (s.isCompleted && s.weight && s.reps) {
          vol += s.weight * s.reps;
        }
      });
    });
    volumeByWeek[key] = (volumeByWeek[key] || 0) + vol;
  });

  // Last 8 weeks
  const weeks = Object.entries(volumeByWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8);

  const maxVol = Math.max(...weeks.map(([, v]) => v), 1);

  const section = document.createElement('div');
  section.className = 'stats__section';

  const title = document.createElement('h2');
  title.className = 'stats__section-title';
  title.textContent = 'WEEKLY VOLUME';
  section.appendChild(title);

  if (weeks.length === 0) {
    section.innerHTML += '<div class="stats__no-data">NO STRENGTH DATA YET</div>';
    return section;
  }

  // Bar chart
  const chart = document.createElement('div');
  chart.className = 'stats__bar-chart';

  weeks.forEach(([weekKey, vol]) => {
    const col = document.createElement('div');
    col.className = 'stats__bar-col';
    const pct = (vol / maxVol) * 100;
    col.innerHTML = `
      <div class="stats__bar" style="height: ${pct}%"></div>
      <div class="stats__bar-label">${weekKey.split('-W')[1]}</div>
    `;
    chart.appendChild(col);
  });
  section.appendChild(chart);

  return section;
}

/**
 * Build the Weight Progression section
 * @param {Array} completed - Array of completed workouts
 * @returns {HTMLElement}
 */
function buildProgressionSection(completed) {
  // Build map: exerciseName → [{ date, maxWeight }] per workout
  const exerciseData = {};
  completed.forEach(w => {
    w.exercises.forEach(we => {
      if (we.exerciseType !== 'strength') return;
      const maxW = Math.max(...we.sets.filter(s => s.weight).map(s => s.weight), 0);
      if (maxW === 0) return;
      if (!exerciseData[we.exerciseName]) exerciseData[we.exerciseName] = [];
      exerciseData[we.exerciseName].push({
        date: w.completedAt.slice(0, 10),
        maxWeight: maxW,
      });
    });
  });

  // Top 5 most-used exercises
  const top5 = Object.entries(exerciseData)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 5);

  const section = document.createElement('div');
  section.className = 'stats__section';

  const title = document.createElement('h2');
  title.className = 'stats__section-title';
  title.textContent = 'WEIGHT PROGRESSION';
  section.appendChild(title);

  if (top5.length === 0) {
    section.innerHTML += '<div class="stats__no-data">LOG STRENGTH SETS TO SEE PROGRESSION</div>';
    return section;
  }

  // Exercise selector chips
  const chips = document.createElement('div');
  chips.className = 'stats__chips';
  let selectedExercise = top5[0][0];

  const chartContainer = document.createElement('div');
  chartContainer.className = 'stats__progression-chart';

  function renderProgressionChart() {
    chartContainer.innerHTML = '';
    const data = exerciseData[selectedExercise] || [];
    if (data.length < 2) {
      chartContainer.innerHTML = '<div class="stats__no-data">NEED MORE DATA</div>';
      return;
    }
    const maxW = Math.max(...data.map(d => d.maxWeight));
    const chart = document.createElement('div');
    chart.className = 'stats__bar-chart';
    data.slice(-8).forEach(({ date, maxWeight }) => {
      const pct = (maxWeight / maxW) * 100;
      const col = document.createElement('div');
      col.className = 'stats__bar-col';
      col.innerHTML = `
        <div class="stats__bar" style="height:${pct}%"></div>
        <div class="stats__bar-label">${date.slice(5)}</div>
      `;
      chart.appendChild(col);
    });
    chartContainer.appendChild(chart);
  }

  top5.forEach(([name]) => {
    const chip = document.createElement('button');
    chip.className = `stats__chip${name === selectedExercise ? ' stats__chip--selected' : ''}`;
    chip.textContent = name;
    chip.addEventListener('click', () => {
      selectedExercise = name;
      chips.querySelectorAll('.stats__chip').forEach(c => c.classList.remove('stats__chip--selected'));
      chip.classList.add('stats__chip--selected');
      renderProgressionChart();
    });
    chips.appendChild(chip);
  });

  section.appendChild(chips);
  section.appendChild(chartContainer);
  renderProgressionChart();

  return section;
}
