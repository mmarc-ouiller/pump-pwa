/**
 * Phase 1B.4 — Exercise Picker Modal
 * Imperative API for opening/closing the exercise picker modal dialog
 */

import { fetchExercises, createExercise } from '../../core/store.js';
import { renderButton } from '../../components/button.js';

// State
let currentOnSelect = null;
let searchDebounce = null;
let currentCategory = 'all';
let allExercises = [];
let searchQuery = '';
let showCreateForm = false;

/**
 * Open the exercise picker modal
 * @param {{ onSelect: (exercise: any) => void }} options
 * @returns {void}
 */
export function openExercisePicker({ onSelect }) {
  currentOnSelect = onSelect;
  currentCategory = 'all';
  searchQuery = '';
  showCreateForm = false;

  const modal = document.getElementById('modal');
  renderPickerContent(modal);
  modal.showModal();

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeExercisePicker();
  }, { once: true });

  // Handle ESC key with cleanup
  modal.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeExercisePicker();
  }, { once: true });

  // Focus the search input after a small delay
  setTimeout(() => {
    modal.querySelector('.picker__search')?.focus();
  }, 50);
}

/**
 * Close the exercise picker modal
 * @returns {void}
 */
export function closeExercisePicker() {
  const modal = document.getElementById('modal');
  modal.close();
  modal.innerHTML = '';
  modal.className = '';
  currentOnSelect = null;
  searchDebounce = null;
  currentCategory = 'all';
  allExercises = [];
  searchQuery = '';
  showCreateForm = false;
}

/**
 * Render the picker content into the modal
 */
async function renderPickerContent(modal) {
  allExercises = await fetchExercises();

  modal.innerHTML = '';
  modal.className = 'picker';

  // Header row: "SELECT EXERCISE" title + × close + "+ NEW" button
  const header = document.createElement('div');
  header.className = 'picker__header';

  const title = document.createElement('h2');
  title.className = 'picker__title';
  title.textContent = 'SELECT EXERCISE';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'picker__close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', closeExercisePicker);

  const newBtn = renderButton({
    title: '+ NEW',
    variant: 'outline',
    onClick: () => {
      showCreateForm = true;
      renderPickerContent(modal);
    },
  });
  newBtn.className += ' picker__new-btn';

  header.appendChild(title);
  header.appendChild(closeBtn);
  header.appendChild(newBtn);
  modal.appendChild(header);

  if (showCreateForm) {
    modal.appendChild(buildCreateForm(modal));
    return;
  }

  // Search input
  const searchInput = document.createElement('input');
  searchInput.className = 'picker__search';
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
  modal.appendChild(searchInput);

  // Category filter chips (horizontal scroll)
  const chips = document.createElement('div');
  chips.className = 'picker__chips';

  const categories = ['all', 'push', 'pull', 'legs', 'core', 'cardio'];
  categories.forEach((cat) => {
    const chip = document.createElement('button');
    chip.className = `picker__chip${currentCategory === cat ? ' picker__chip--selected' : ''}`;
    chip.textContent = cat.toUpperCase();
    chip.setAttribute('aria-pressed', currentCategory === cat ? 'true' : 'false');
    chip.addEventListener('click', () => {
      currentCategory = cat;
      renderPickerContent(modal);
    });
    chips.appendChild(chip);
  });
  modal.appendChild(chips);

  // Exercise list container
  const listContainer = document.createElement('div');
  listContainer.className = 'picker__list';
  modal.appendChild(listContainer);

  function renderList() {
    listContainer.innerHTML = '';

    let filtered = allExercises;
    if (currentCategory !== 'all') {
      filtered = filtered.filter((ex) => ex.category === currentCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((ex) => ex.name.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = '<div class="picker__empty">NO EXERCISES FOUND</div>';
      return;
    }

    // Group by category (only when showing all or searching)
    if (currentCategory === 'all' || searchQuery.trim()) {
      const groups = {};
      filtered.forEach((ex) => {
        if (!groups[ex.category]) groups[ex.category] = [];
        groups[ex.category].push(ex);
      });

      Object.entries(groups).forEach(([cat, exercises]) => {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'picker__group-header';
        groupHeader.textContent = cat.toUpperCase();
        listContainer.appendChild(groupHeader);
        exercises.forEach((ex) => listContainer.appendChild(buildExerciseRow(ex)));
      });
    } else {
      filtered.forEach((ex) => listContainer.appendChild(buildExerciseRow(ex)));
    }
  }

  renderList();
}

/**
 * Build an exercise row button
 */
function buildExerciseRow(exercise) {
  const row = document.createElement('button');
  row.className = 'picker__exercise-row';
  row.setAttribute('aria-label', `Select ${exercise.name}`);
  row.innerHTML = `
    <div class="picker__exercise-info">
      <span class="picker__exercise-name">${exercise.name}</span>
      ${exercise.isCustom ? '<span class="picker__custom-tag">CUSTOM</span>' : ''}
    </div>
    <span class="picker__exercise-type">${exercise.type.toUpperCase()}</span>
  `;
  row.addEventListener('click', () => {
    if (currentOnSelect) currentOnSelect(exercise);
    closeExercisePicker();
  });
  return row;
}

/**
 * Build the create exercise form
 */
function buildCreateForm(modal) {
  const form = document.createElement('div');
  form.className = 'picker__create-form';

  let newName = '';
  let newCategory = 'push';
  let newType = 'strength';

  // Name input
  const nameLabel = document.createElement('label');
  nameLabel.className = 'picker__label';
  nameLabel.textContent = 'EXERCISE NAME';
  form.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.className = 'picker__search';
  nameInput.type = 'text';
  nameInput.placeholder = 'NAME';
  nameInput.addEventListener('input', (e) => {
    newName = e.target.value;
  });
  form.appendChild(nameInput);

  // Category selector
  const catLabel = document.createElement('label');
  catLabel.className = 'picker__label';
  catLabel.textContent = 'CATEGORY';
  form.appendChild(catLabel);

  const catRow = document.createElement('div');
  catRow.className = 'picker__chips picker__chips--wrap';
  const categories = ['push', 'pull', 'legs', 'core', 'cardio'];
  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = `picker__chip${newCategory === cat ? ' picker__chip--selected' : ''}`;
    btn.textContent = cat.toUpperCase();
    btn.addEventListener('click', () => {
      newCategory = cat;
      catRow.querySelectorAll('.picker__chip').forEach((c) => c.classList.remove('picker__chip--selected'));
      btn.classList.add('picker__chip--selected');
    });
    catRow.appendChild(btn);
  });
  form.appendChild(catRow);

  // Type selector
  const typeLabel = document.createElement('label');
  typeLabel.className = 'picker__label';
  typeLabel.textContent = 'TYPE';
  form.appendChild(typeLabel);

  const typeRow = document.createElement('div');
  typeRow.className = 'picker__chips';
  ['strength', 'cardio'].forEach((t) => {
    const btn = document.createElement('button');
    btn.className = `picker__chip${newType === t ? ' picker__chip--selected' : ''}`;
    btn.textContent = t.toUpperCase();
    btn.addEventListener('click', () => {
      newType = t;
      typeRow.querySelectorAll('.picker__chip').forEach((c) => c.classList.remove('picker__chip--selected'));
      btn.classList.add('picker__chip--selected');
    });
    typeRow.appendChild(btn);
  });
  form.appendChild(typeRow);

  // Create button
  const createBtn = renderButton({
    title: 'CREATE EXERCISE',
    variant: 'solid',
    onClick: async () => {
      if (!newName.trim()) {
        alert('Please enter a name.');
        return;
      }
      const exercise = await createExercise({
        name: newName.trim(),
        category: newCategory,
        type: newType,
      });
      allExercises.push(exercise);
      showCreateForm = false;
      renderPickerContent(modal);
    },
  });
  createBtn.className += ' picker__create-btn';
  form.appendChild(createBtn);

  return form;
}
