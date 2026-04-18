/**
 * Phase 1F — Exercises Tab with Body-Part Taxonomy
 * Full-screen view for browsing and managing the exercise library
 * V2 model: Exercise.type = body part, Exercise.measureBy = measurement method
 */

import { fetchExercises, createExercise, updateExercise, deleteExercise } from '../../core/store.js';
import { renderButton } from '../../components/button.js';

let currentType = 'all';
let searchQuery = '';
let searchDebounce = null;

// Body-part types in display order
const BODY_PARTS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'cardio'];

// measureBy display labels
const MEASURE_BY_LABEL = {
  weight: 'WEIGHT',
  seconds: 'SECONDS',
  repsOnly: 'REPS',
};

/**
 * Render the EXERCISES tab
 * @param {HTMLElement} appEl
 * @returns {Promise<void>}
 */
export async function renderExercises(appEl) {
  // Reset state on each render
  currentType = 'all';
  searchQuery = '';

  const exercises = await fetchExercises();

  appEl.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'exercises';

  // Header with title + "+ NEW EXERCISE" button
  const header = document.createElement('div');
  header.className = 'exercises__header';

  const title = document.createElement('h1');
  title.className = 'exercises__title';
  title.textContent = 'EXERCISES';

  const newBtn = renderButton({
    title: '+ NEW EXERCISE',
    variant: 'outline',
    onClick: () => showCreateForm(container, appEl),
  });
  newBtn.className += ' exercises__new-btn';

  header.appendChild(title);
  header.appendChild(newBtn);
  container.appendChild(header);

  // Search input
  const searchInput = document.createElement('input');
  searchInput.className = 'exercises__search';
  searchInput.type = 'search';
  searchInput.placeholder = 'SEARCH EXERCISES';
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchQuery = e.target.value;
      rerenderList();
    }, 150);
  });
  container.appendChild(searchInput);

  // Body-part filter chips (9 total: ALL + 8 body parts)
  const chipsContainer = document.createElement('div');
  chipsContainer.className = 'exercises__chips';

  const chipLabels = ['all', ...BODY_PARTS];
  chipLabels.forEach((type) => {
    const chip = document.createElement('button');
    chip.className = `exercises__chip${currentType === type ? ' exercises__chip--active' : ''}`;
    chip.textContent = type.toUpperCase();
    chip.addEventListener('click', () => {
      currentType = type;
      chipsContainer.querySelectorAll('.exercises__chip').forEach((c) => c.classList.remove('exercises__chip--active'));
      chip.classList.add('exercises__chip--active');
      rerenderList();
    });
    chipsContainer.appendChild(chip);
  });
  container.appendChild(chipsContainer);

  // List container
  const listEl = document.createElement('div');
  listEl.className = 'exercises__list';
  container.appendChild(listEl);

  let allExercises = exercises;

  function rerenderList() {
    listEl.innerHTML = '';
    let filtered = allExercises;

    if (currentType !== 'all') {
      filtered = filtered.filter((ex) => ex.type === currentType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((ex) => ex.name.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      const emptyMsg = searchQuery.trim() ? 'NO EXERCISES MATCHING YOUR FILTER' : 'NO EXERCISES FOUND';
      listEl.innerHTML = `<div class="exercises__empty">${emptyMsg}</div>`;
      return;
    }

    // Group by body-part type when ALL is selected
    if (currentType === 'all') {
      const groups = {};
      filtered.forEach((ex) => {
        if (!groups[ex.type]) groups[ex.type] = [];
        groups[ex.type].push(ex);
      });

      BODY_PARTS.forEach((bodyPart) => {
        if (!groups[bodyPart] || groups[bodyPart].length === 0) return;
        const groupHeader = document.createElement('div');
        groupHeader.className = 'exercises__group-header';
        groupHeader.textContent = bodyPart.toUpperCase();
        listEl.appendChild(groupHeader);
        groups[bodyPart].forEach((ex) => listEl.appendChild(buildExerciseRow(ex)));
      });
    } else {
      // Flat list when a specific type is selected
      filtered.forEach((ex) => listEl.appendChild(buildExerciseRow(ex)));
    }
  }

  function buildExerciseRow(exercise) {
    const row = document.createElement('div');
    row.className = 'exercises__row';

    const info = document.createElement('div');
    info.className = 'exercises__row-info';

    const name = document.createElement('span');
    name.className = 'exercises__row-name';
    name.textContent = exercise.name;

    const badges = document.createElement('div');
    badges.className = 'exercises__row-badges';

    // measureBy badge
    const measureBadge = document.createElement('span');
    measureBadge.className = `exercises__badge exercises__badge--${exercise.measureBy}`;
    measureBadge.textContent = MEASURE_BY_LABEL[exercise.measureBy];
    badges.appendChild(measureBadge);

    // CUSTOM badge
    if (exercise.isCustom) {
      const customBadge = document.createElement('span');
      customBadge.className = 'exercises__badge exercises__badge--custom';
      customBadge.textContent = 'CUSTOM';
      badges.appendChild(customBadge);
    }

    info.appendChild(name);
    info.appendChild(badges);
    row.appendChild(info);

    // Custom exercises get edit + delete buttons
    if (exercise.isCustom) {
      const actions = document.createElement('div');
      actions.className = 'exercises__row-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'exercises__action-btn exercises__action-btn--edit';
      editBtn.textContent = '✏';
      editBtn.setAttribute('aria-label', `Edit ${exercise.name}`);
      editBtn.addEventListener('click', () => showEditForm(exercise, container, appEl, allExercises, rerenderList));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'exercises__action-btn exercises__action-btn--delete';
      deleteBtn.textContent = '✕';
      deleteBtn.setAttribute('aria-label', `Delete ${exercise.name}`);
      deleteBtn.addEventListener('click', async () => {
        if (window.confirm(`Delete "${exercise.name}"?`)) {
          await deleteExercise(exercise);
          allExercises = allExercises.filter((e) => e.id !== exercise.id);
          rerenderList();
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      row.appendChild(actions);
    }

    return row;
  }

  rerenderList();
  appEl.appendChild(container);
}

function showCreateForm(container, appEl) {
  const overlay = buildFormOverlay({
    title: 'NEW EXERCISE',
    exercise: null,
    onSave: async ({ name, type, measureBy }) => {
      await createExercise({ name, type, measureBy, isCustom: true });
      overlay.remove();
      await renderExercises(appEl);
    },
    onCancel: () => overlay.remove(),
  });
  container.appendChild(overlay);
}

function showEditForm(exercise, container, appEl, allExercises, rerenderList) {
  const overlay = buildFormOverlay({
    title: 'EDIT EXERCISE',
    exercise,
    onSave: async ({ name, type, measureBy }) => {
      const updated = { ...exercise, name, type, measureBy };
      await updateExercise(updated);
      overlay.remove();
      // Re-render the full page to ensure filters are reset
      await renderExercises(appEl);
    },
    onCancel: () => overlay.remove(),
  });
  container.appendChild(overlay);
}

function buildFormOverlay({ title, exercise, onSave, onCancel }) {
  const overlay = document.createElement('div');
  overlay.className = 'exercises__form-overlay';

  const form = document.createElement('div');
  form.className = 'exercises__form';

  // Header
  const header = document.createElement('div');
  header.className = 'exercises__form-header';
  const headerTitle = document.createElement('h2');
  headerTitle.className = 'exercises__form-title';
  headerTitle.textContent = title;
  header.appendChild(headerTitle);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'exercises__form-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', onCancel);
  header.appendChild(closeBtn);
  form.appendChild(header);

  // Name input
  const nameLabel = document.createElement('label');
  nameLabel.className = 'exercises__form-label';
  nameLabel.textContent = 'NAME';
  form.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.className = 'exercises__form-input';
  nameInput.type = 'text';
  nameInput.placeholder = 'EXERCISE NAME';
  nameInput.value = exercise?.name || '';
  form.appendChild(nameInput);

  // Body-part type selector
  const typeLabel = document.createElement('label');
  typeLabel.className = 'exercises__form-label';
  typeLabel.textContent = 'BODY PART';
  form.appendChild(typeLabel);

  let selectedType = exercise?.type || 'chest';
  const typeRow = document.createElement('div');
  typeRow.className = 'exercises__form-options';
  BODY_PARTS.forEach((bodyPart) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `exercises__chip${selectedType === bodyPart ? ' exercises__chip--active' : ''}`;
    btn.textContent = bodyPart.toUpperCase();
    btn.addEventListener('click', () => {
      selectedType = bodyPart;
      typeRow.querySelectorAll('.exercises__chip').forEach((c) => c.classList.remove('exercises__chip--active'));
      btn.classList.add('exercises__chip--active');
    });
    typeRow.appendChild(btn);
  });
  form.appendChild(typeRow);

  // Measure-by selector
  const measureLabel = document.createElement('label');
  measureLabel.className = 'exercises__form-label';
  measureLabel.textContent = 'MEASURE BY';
  form.appendChild(measureLabel);

  let selectedMeasureBy = exercise?.measureBy || 'weight';
  const measureRow = document.createElement('div');
  measureRow.className = 'exercises__form-options';
  ['weight', 'seconds', 'repsOnly'].forEach((mb) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `exercises__chip${selectedMeasureBy === mb ? ' exercises__chip--active' : ''}`;
    btn.textContent = MEASURE_BY_LABEL[mb];
    btn.addEventListener('click', () => {
      selectedMeasureBy = mb;
      measureRow.querySelectorAll('.exercises__chip').forEach((c) => c.classList.remove('exercises__chip--active'));
      btn.classList.add('exercises__chip--active');
    });
    measureRow.appendChild(btn);
  });
  form.appendChild(measureRow);

  // Save button
  const saveBtn = renderButton({
    title: 'SAVE',
    variant: 'solid',
    onClick: async () => {
      const name = nameInput.value.trim();
      if (!name) {
        alert('Please enter a name.');
        return;
      }
      await onSave({ name, type: selectedType, measureBy: selectedMeasureBy });
    },
  });
  saveBtn.className += ' exercises__form-save';
  form.appendChild(saveBtn);

  overlay.appendChild(form);

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) onCancel();
  });

  return overlay;
}
