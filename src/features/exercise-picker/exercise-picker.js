/**
 * Phase 1E — Exercise Picker Multi-select
 * Fullscreen overlay with checkbox multi-select, 9 body-part filter chips, and create-new form
 */

import { fetchExercises, createExercise } from '../../core/store.js';

// Body parts in order (ALL + 8 parts)
const BODY_PARTS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'cardio'];

// State
let currentOnSelect = null;
let currentOnCancel = null;
let searchDebounce = null;
let currentFilter = 'all';
let allExercises = [];
let searchQuery = '';
let showCreateForm = false;
let selectedExerciseIds = new Set();

/**
 * Show the exercise picker overlay
 * @param {{ onSelect: (exercises: Exercise[]) => void, onCancel: () => void }} options
 * @returns {void}
 */
export function showExercisePicker({ onSelect, onCancel }) {
  currentOnSelect = onSelect;
  currentOnCancel = onCancel;
  currentFilter = 'all';
  searchQuery = '';
  showCreateForm = false;
  selectedExerciseIds = new Set();

  // Create and append overlay
  const overlay = document.createElement('div');
  overlay.className = 'exercise-picker-overlay';
  document.body.appendChild(overlay);

  renderPickerContent(overlay);

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismiss();
  });

  // Focus the search input
  setTimeout(() => {
    overlay.querySelector('.picker-search')?.focus();
  }, 50);
}

/**
 * Dismiss the picker overlay
 */
function dismiss() {
  const overlay = document.querySelector('.exercise-picker-overlay');
  if (overlay) {
    overlay.remove();
  }
  currentOnSelect = null;
  currentOnCancel = null;
  searchDebounce = null;
  currentFilter = 'all';
  allExercises = [];
  searchQuery = '';
  showCreateForm = false;
  selectedExerciseIds = new Set();
}

/**
 * Render the picker content into the overlay
 */
async function renderPickerContent(overlay) {
  allExercises = await fetchExercises();

  overlay.innerHTML = '';

  // Header with CANCEL and ADD (N) buttons
  const header = document.createElement('div');
  header.className = 'picker-header';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'picker-header-btn picker-cancel-btn';
  cancelBtn.textContent = 'CANCEL';
  cancelBtn.addEventListener('click', () => {
    if (currentOnCancel) currentOnCancel();
    dismiss();
  });
  header.appendChild(cancelBtn);

  const title = document.createElement('h2');
  title.className = 'picker-header-title';
  title.textContent = 'Exercise Picker';
  header.appendChild(title);

  const addBtn = document.createElement('button');
  addBtn.className = 'picker-header-btn picker-add-btn';
  addBtn.disabled = selectedExerciseIds.size === 0;
  const updateAddBtn = () => {
    const count = selectedExerciseIds.size;
    addBtn.textContent = count === 0 ? 'ADD' : `ADD (${count})`;
    addBtn.disabled = count === 0;
  };
  updateAddBtn();

  addBtn.addEventListener('click', () => {
    const selectedExercises = allExercises.filter(ex => selectedExerciseIds.has(ex.id));
    if (currentOnSelect) currentOnSelect(selectedExercises);
    dismiss();
  });
  header.appendChild(addBtn);
  overlay.appendChild(header);

  if (showCreateForm) {
    const createSection = buildCreateForm(overlay, () => {
      updateAddBtn();
    });
    overlay.appendChild(createSection);
    return;
  }

  // Search input
  const searchInput = document.createElement('input');
  searchInput.className = 'picker-search';
  searchInput.type = 'search';
  searchInput.placeholder = 'SEARCH EXERCISES';
  searchInput.value = searchQuery;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchQuery = e.target.value;
      renderList();
    }, 150);
  });
  overlay.appendChild(searchInput);

  // Filter chips (ALL + 8 body parts)
  const chipsContainer = document.createElement('div');
  chipsContainer.className = 'picker-chips';

  const allChip = document.createElement('button');
  allChip.className = `picker-chip${currentFilter === 'all' ? ' picker-chip--active' : ''}`;
  allChip.textContent = 'ALL';
  allChip.addEventListener('click', () => {
    currentFilter = 'all';
    renderPickerContent(overlay);
  });
  chipsContainer.appendChild(allChip);

  BODY_PARTS.forEach((part) => {
    const chip = document.createElement('button');
    chip.className = `picker-chip${currentFilter === part ? ' picker-chip--active' : ''}`;
    chip.textContent = part.toUpperCase();
    chip.addEventListener('click', () => {
      currentFilter = part;
      renderPickerContent(overlay);
    });
    chipsContainer.appendChild(chip);
  });
  overlay.appendChild(chipsContainer);

  // Exercise list container
  const listContainer = document.createElement('div');
  listContainer.className = 'picker-list';
  overlay.appendChild(listContainer);

  function renderList() {
    listContainer.innerHTML = '';

    let filtered = allExercises;
    if (currentFilter !== 'all') {
      filtered = filtered.filter((ex) => ex.type === currentFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((ex) => ex.name.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = '<div class="picker-empty">NO EXERCISES FOUND</div>';
      return;
    }

    // Group by body part when ALL is selected
    if (currentFilter === 'all') {
      BODY_PARTS.forEach((part) => {
        const exercises = filtered.filter((ex) => ex.type === part);
        if (exercises.length === 0) return;

        const heading = document.createElement('div');
        heading.className = 'picker-section-heading';
        heading.textContent = part.toUpperCase();
        listContainer.appendChild(heading);

        exercises.forEach((ex) => {
          listContainer.appendChild(buildExerciseRow(ex, updateAddBtn));
        });
      });
    } else {
      // Flat list when filtering by a specific body part
      filtered.forEach((ex) => {
        listContainer.appendChild(buildExerciseRow(ex, updateAddBtn));
      });
    }
  }

  renderList();
}

/**
 * Build an exercise row with checkbox
 */
function buildExerciseRow(exercise, onSelectionChange) {
  const row = document.createElement('div');
  row.className = 'picker-exercise-row';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `exercise-${exercise.id}`;
  checkbox.checked = selectedExerciseIds.has(exercise.id);
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      selectedExerciseIds.add(exercise.id);
    } else {
      selectedExerciseIds.delete(exercise.id);
    }
    onSelectionChange();
  });
  row.appendChild(checkbox);

  const label = document.createElement('label');
  label.htmlFor = `exercise-${exercise.id}`;
  label.className = 'picker-exercise-label';

  const name = document.createElement('span');
  name.className = 'picker-exercise-name';
  name.textContent = exercise.name;
  label.appendChild(name);

  const badge = document.createElement('span');
  badge.className = 'picker-badge';
  const measureLabel = exercise.measureBy === 'weight' ? 'WEIGHT' :
                       exercise.measureBy === 'seconds' ? 'SECONDS' :
                       'REPS';
  badge.textContent = measureLabel;
  label.appendChild(badge);

  row.appendChild(label);
  return row;
}

/**
 * Build the create exercise form (collapsible at bottom)
 */
function buildCreateForm(overlay, onExerciseCreated) {
  const formContainer = document.createElement('div');
  formContainer.className = 'picker-create-container';

  let newName = '';
  let newType = 'chest';
  let newMeasureBy = 'weight';

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'picker-create-toggle';
  toggleBtn.textContent = '＋ CREATE NEW EXERCISE';
  formContainer.appendChild(toggleBtn);

  // Form content (initially hidden)
  const form = document.createElement('div');
  form.className = 'picker-create-form picker-create-form--hidden';
  formContainer.appendChild(form);

  toggleBtn.addEventListener('click', () => {
    form.classList.toggle('picker-create-form--hidden');
  });

  // Name input
  const nameLabel = document.createElement('label');
  nameLabel.className = 'picker-label';
  nameLabel.textContent = 'EXERCISE NAME';
  form.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.className = 'picker-search';
  nameInput.type = 'text';
  nameInput.placeholder = 'NAME';
  nameInput.addEventListener('input', (e) => {
    newName = e.target.value;
  });
  form.appendChild(nameInput);

  // Body part selector
  const typeLabel = document.createElement('label');
  typeLabel.className = 'picker-label';
  typeLabel.textContent = 'BODY PART';
  form.appendChild(typeLabel);

  const typeSelect = document.createElement('select');
  typeSelect.className = 'picker-select';
  BODY_PARTS.forEach((part) => {
    const option = document.createElement('option');
    option.value = part;
    option.textContent = part.charAt(0).toUpperCase() + part.slice(1);
    typeSelect.appendChild(option);
  });
  typeSelect.addEventListener('change', (e) => {
    newType = e.target.value;
  });
  form.appendChild(typeSelect);

  // Measure by radios
  const measureLabel = document.createElement('label');
  measureLabel.className = 'picker-label';
  measureLabel.textContent = 'MEASURE BY';
  form.appendChild(measureLabel);

  const measureContainer = document.createElement('div');
  measureContainer.className = 'picker-measure-options';

  ['weight', 'seconds', 'repsOnly'].forEach((measure) => {
    const radioWrapper = document.createElement('div');
    radioWrapper.className = 'picker-radio-wrapper';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'measureBy';
    radio.value = measure;
    radio.id = `measure-${measure}`;
    radio.checked = measure === 'weight';
    radio.addEventListener('change', (e) => {
      if (e.target.checked) newMeasureBy = measure;
    });
    radioWrapper.appendChild(radio);

    const label = document.createElement('label');
    label.htmlFor = `measure-${measure}`;
    const text = measure === 'weight' ? 'Weight' :
                 measure === 'seconds' ? 'Seconds' :
                 'Reps Only';
    label.textContent = text;
    radioWrapper.appendChild(label);

    measureContainer.appendChild(radioWrapper);
  });
  form.appendChild(measureContainer);

  // Buttons
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'picker-create-buttons';

  const createBtn = document.createElement('button');
  createBtn.className = 'picker-create-btn';
  createBtn.textContent = 'CREATE';
  createBtn.addEventListener('click', async () => {
    if (!newName.trim()) {
      alert('Please enter a name.');
      return;
    }
    try {
      const exercise = await createExercise({
        name: newName.trim(),
        type: newType,
        measureBy: newMeasureBy,
        isCustom: true,
      });
      // Auto-select the new exercise
      selectedExerciseIds.add(exercise.id);
      allExercises.push(exercise);
      showCreateForm = false;
      onExerciseCreated();
      renderPickerContent(overlay.parentNode === document.body ? overlay : overlay.closest('.exercise-picker-overlay'));
    } catch (error) {
      console.error('Failed to create exercise:', error);
      alert('Failed to create exercise.');
    }
  });
  buttonGroup.appendChild(createBtn);

  const cancelCreateBtn = document.createElement('button');
  cancelCreateBtn.className = 'picker-cancel-create-btn';
  cancelCreateBtn.textContent = 'CANCEL';
  cancelCreateBtn.addEventListener('click', () => {
    showCreateForm = false;
    renderPickerContent(overlay.parentNode === document.body ? overlay : overlay.closest('.exercise-picker-overlay'));
  });
  buttonGroup.appendChild(cancelCreateBtn);

  form.appendChild(buttonGroup);

  return formContainer;
}
