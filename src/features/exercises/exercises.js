/**
 * Phase 1B — Exercise Bank Tab
 * Full-screen view for browsing and managing the exercise library
 */

import { fetchExercises, createExercise, updateExercise, deleteExercise } from '../../core/store.js';
import { renderButton } from '../../components/button.js';

let currentCategory = 'all';
let searchQuery = '';
let searchDebounce = null;

/**
 * Render the EXERCISES tab
 * @param {HTMLElement} appEl
 * @returns {Promise<void>}
 */
export async function renderExercises(appEl) {
  // Reset state on each render
  currentCategory = 'all';
  searchQuery = '';

  const exercises = await fetchExercises();

  appEl.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'exercises';

  // Header with title + "+ NEW" button
  const header = document.createElement('div');
  header.className = 'exercises__header';

  const title = document.createElement('h1');
  title.className = 'exercises__title';
  title.textContent = 'EXERCISES';

  const newBtn = renderButton({
    title: '+ NEW',
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

  // Category filter chips
  const chips = document.createElement('div');
  chips.className = 'exercises__chips';
  const categories = ['all', 'push', 'pull', 'legs', 'core', 'cardio'];
  categories.forEach((cat) => {
    const chip = document.createElement('button');
    chip.className = `exercises__chip${currentCategory === cat ? ' exercises__chip--selected' : ''}`;
    chip.textContent = cat.toUpperCase();
    chip.addEventListener('click', () => {
      currentCategory = cat;
      chips.querySelectorAll('.exercises__chip').forEach((c) => c.classList.remove('exercises__chip--selected'));
      chip.classList.add('exercises__chip--selected');
      rerenderList();
    });
    chips.appendChild(chip);
  });
  container.appendChild(chips);

  // List container
  const listEl = document.createElement('div');
  listEl.className = 'exercises__list';
  container.appendChild(listEl);

  let allExercises = exercises;

  function rerenderList() {
    listEl.innerHTML = '';
    let filtered = allExercises;

    if (currentCategory !== 'all') {
      filtered = filtered.filter((ex) => ex.category === currentCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((ex) => ex.name.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="exercises__empty">NO EXERCISES FOUND</div>';
      return;
    }

    // Group by category when showing all or when searching
    if (currentCategory === 'all' || searchQuery.trim()) {
      const groups = {};
      filtered.forEach((ex) => {
        if (!groups[ex.category]) groups[ex.category] = [];
        groups[ex.category].push(ex);
      });

      const catOrder = ['push', 'pull', 'legs', 'core', 'cardio'];
      catOrder.forEach((cat) => {
        if (!groups[cat] || groups[cat].length === 0) return;
        const groupHeader = document.createElement('div');
        groupHeader.className = 'exercises__group-header';
        groupHeader.textContent = cat.toUpperCase();
        listEl.appendChild(groupHeader);
        groups[cat].forEach((ex) => listEl.appendChild(buildExerciseRow(ex)));
      });
    } else {
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

    const tags = document.createElement('div');
    tags.className = 'exercises__row-tags';
    tags.innerHTML = `<span class="exercises__tag">${exercise.type.toUpperCase()}</span>${exercise.isCustom ? '<span class="exercises__tag exercises__tag--custom">CUSTOM</span>' : ''}`;

    info.appendChild(name);
    info.appendChild(tags);
    row.appendChild(info);

    // Custom exercises get edit + delete buttons
    if (exercise.isCustom) {
      const actions = document.createElement('div');
      actions.className = 'exercises__row-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'exercises__action-btn';
      editBtn.textContent = 'EDIT';
      editBtn.setAttribute('aria-label', `Edit ${exercise.name}`);
      editBtn.addEventListener('click', () => showEditForm(exercise, container, appEl, allExercises, rerenderList));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'exercises__action-btn exercises__action-btn--danger';
      deleteBtn.textContent = '×';
      deleteBtn.setAttribute('aria-label', `Delete ${exercise.name}`);
      deleteBtn.addEventListener('click', async () => {
        if (window.confirm(`Delete "${exercise.name}"? This cannot be undone.`)) {
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
    onSave: async ({ name, category, type }) => {
      await createExercise({ name, category, type });
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
    onSave: async ({ name, category, type }) => {
      const updated = { ...exercise, name, category, type };
      await updateExercise(updated);
      overlay.remove();
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
  header.innerHTML = `<h2 class="exercises__form-title">${title}</h2>`;
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

  // Category selector
  const catLabel = document.createElement('label');
  catLabel.className = 'exercises__form-label';
  catLabel.textContent = 'CATEGORY';
  form.appendChild(catLabel);

  let selectedCategory = exercise?.category || 'push';
  const catRow = document.createElement('div');
  catRow.className = 'exercises__form-chips';
  ['push', 'pull', 'legs', 'core', 'cardio'].forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = `exercises__chip${selectedCategory === cat ? ' exercises__chip--selected' : ''}`;
    btn.textContent = cat.toUpperCase();
    btn.addEventListener('click', () => {
      selectedCategory = cat;
      catRow.querySelectorAll('.exercises__chip').forEach((c) => c.classList.remove('exercises__chip--selected'));
      btn.classList.add('exercises__chip--selected');
    });
    catRow.appendChild(btn);
  });
  form.appendChild(catRow);

  // Type selector
  const typeLabel = document.createElement('label');
  typeLabel.className = 'exercises__form-label';
  typeLabel.textContent = 'TYPE';
  form.appendChild(typeLabel);

  let selectedType = exercise?.type || 'strength';
  const typeRow = document.createElement('div');
  typeRow.className = 'exercises__form-chips';
  ['strength', 'cardio'].forEach((t) => {
    const btn = document.createElement('button');
    btn.className = `exercises__chip${selectedType === t ? ' exercises__chip--selected' : ''}`;
    btn.textContent = t.toUpperCase();
    btn.addEventListener('click', () => {
      selectedType = t;
      typeRow.querySelectorAll('.exercises__chip').forEach((c) => c.classList.remove('exercises__chip--selected'));
      btn.classList.add('exercises__chip--selected');
    });
    typeRow.appendChild(btn);
  });
  form.appendChild(typeRow);

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
      await onSave({ name, category: selectedCategory, type: selectedType });
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
