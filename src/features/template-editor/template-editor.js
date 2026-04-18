/**
 * Phase 1G — Template Editor (Rewritten for V2)
 * Edit or create a template with V2 TemplateExercise + TemplateSetGroup structure
 * Per the plan, per-exercise setGroups are NOT editable here (edited via workout planning flow)
 * The editor manages exercise list, order, and shows totalSets badge per row
 */

import { fetchExercises, createTemplate, updateTemplate, deleteTemplate } from '../../core/store.js';
import { navigate } from '../../core/router.js';

let currentOverlay = null;

/**
 * Render the template editor at a route
 * @param {HTMLElement} appEl
 * @param {{ id: string }} options - 'new' for new template, or a template UUID
 * @returns {Promise<void>}
 */
export async function renderTemplateEditor(appEl, { id }) {
  // Determine if new or edit mode
  let template = null;
  if (id !== 'new') {
    // TODO: fetch template by id (Phase 2 will wire this up with the route handler)
    // For now, stub it
  }

  const container = document.createElement('div');
  container.className = 'template-editor';

  // Back button and header
  const header = document.createElement('div');
  header.className = 'template-editor-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'template-editor-back-btn';
  backBtn.textContent = '← BACK';
  backBtn.addEventListener('click', () => navigate('/'));
  header.appendChild(backBtn);

  const title = document.createElement('h1');
  title.className = 'template-editor-title';
  title.textContent = template ? 'EDIT TEMPLATE' : 'NEW TEMPLATE';
  header.appendChild(title);

  container.appendChild(header);

  // Name input
  const nameLabel = document.createElement('label');
  nameLabel.className = 'template-editor-label';
  nameLabel.textContent = 'TEMPLATE NAME';
  container.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.className = 'template-editor-name-input';
  nameInput.type = 'text';
  nameInput.placeholder = 'E.G. PUSH DAY';
  nameInput.value = template?.name || '';
  container.appendChild(nameInput);

  // Exercise list label
  const exLabel = document.createElement('label');
  exLabel.className = 'template-editor-label';
  exLabel.textContent = 'EXERCISES';
  container.appendChild(exLabel);

  // Exercise list container (re-renderable)
  const exListEl = document.createElement('div');
  exListEl.className = 'template-editor-ex-list';
  container.appendChild(exListEl);

  // Working copy of template exercises
  let templateExercises = template ? template.templateExercises.map(te => ({ ...te })) : [];

  function rerenderExList() {
    exListEl.innerHTML = '';
    if (templateExercises.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'template-editor-ex-empty';
      empty.textContent = 'NO EXERCISES YET';
      exListEl.appendChild(empty);
      return;
    }

    templateExercises.forEach((te, idx) => {
      const row = document.createElement('div');
      row.className = 'template-editor-ex-row';

      // Exercise name
      const nameEl = document.createElement('span');
      nameEl.className = 'template-editor-ex-name';
      nameEl.textContent = te.exerciseName;

      // Total sets badge
      let totalSets = 0;
      if (te.setGroups) {
        te.setGroups.forEach(sg => {
          totalSets += sg.sets || 0;
        });
      }

      const badgeEl = document.createElement('span');
      badgeEl.className = 'template-editor-ex-badge';
      badgeEl.textContent = `${totalSets} SET${totalSets !== 1 ? 'S' : ''}`;

      const leftSection = document.createElement('div');
      leftSection.className = 'template-editor-ex-left';
      leftSection.appendChild(nameEl);
      leftSection.appendChild(badgeEl);

      row.appendChild(leftSection);

      // Reorder buttons
      const btns = document.createElement('div');
      btns.className = 'template-editor-ex-btns';

      if (idx > 0) {
        const upBtn = document.createElement('button');
        upBtn.className = 'template-editor-ex-btn';
        upBtn.textContent = '▲';
        upBtn.setAttribute('aria-label', `Move ${te.exerciseName} up`);
        upBtn.addEventListener('click', () => {
          const temp = templateExercises[idx];
          templateExercises[idx] = templateExercises[idx - 1];
          templateExercises[idx - 1] = temp;
          rerenderExList();
        });
        btns.appendChild(upBtn);
      }

      if (idx < templateExercises.length - 1) {
        const downBtn = document.createElement('button');
        downBtn.className = 'template-editor-ex-btn';
        downBtn.textContent = '▼';
        downBtn.setAttribute('aria-label', `Move ${te.exerciseName} down`);
        downBtn.addEventListener('click', () => {
          const temp = templateExercises[idx];
          templateExercises[idx] = templateExercises[idx + 1];
          templateExercises[idx + 1] = temp;
          rerenderExList();
        });
        btns.appendChild(downBtn);
      }

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'template-editor-ex-btn template-editor-ex-btn--remove';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', `Remove ${te.exerciseName}`);
      removeBtn.addEventListener('click', () => {
        templateExercises.splice(idx, 1);
        rerenderExList();
      });
      btns.appendChild(removeBtn);

      row.appendChild(btns);
      exListEl.appendChild(row);
    });
  }

  rerenderExList();

  // Add exercise button
  const addExBtn = document.createElement('button');
  addExBtn.className = 'template-editor-add-ex-btn';
  addExBtn.textContent = '+ ADD EXERCISE';
  addExBtn.addEventListener('click', async () => {
    // Dynamically import the exercise picker
    const { showExercisePicker } = await import('../exercise-picker/exercise-picker.js');
    showExercisePicker({
      onSelect: async (exercises) => {
        // exercises is an array (multi-select)
        // For each selected exercise, add a TemplateExercise with a default TemplateSetGroup
        for (const exercise of exercises) {
          const templateExercise = {
            id: crypto.randomUUID(),
            order: templateExercises.length,
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            setGroups: [
              {
                id: crypto.randomUUID(),
                order: 0,
                sets: 3,
                reps: 10,
                weight: null,
                duration: null,
              }
            ]
          };
          templateExercises.push(templateExercise);
        }
        rerenderExList();
      },
      onCancel: () => {
        // Picker dismissed
      }
    });
  });
  container.appendChild(addExBtn);

  // Action buttons (SAVE, CANCEL, DELETE if edit)
  const actionBtns = document.createElement('div');
  actionBtns.className = 'template-editor-action-btns';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'template-editor-save-btn';
  saveBtn.textContent = template ? 'SAVE CHANGES' : 'CREATE TEMPLATE';
  saveBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert('Please enter a template name.');
      return;
    }

    try {
      if (template) {
        // Update existing
        await updateTemplate({
          ...template,
          name,
          templateExercises
        });
      } else {
        // Create new
        await createTemplate({
          name,
          templateExercises,
          order: 0,
          isCustom: true
        });
      }
      navigate('/');
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    }
  });
  actionBtns.appendChild(saveBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'template-editor-cancel-btn';
  cancelBtn.textContent = 'CANCEL';
  cancelBtn.addEventListener('click', () => navigate('/'));
  actionBtns.appendChild(cancelBtn);

  // Delete button (edit mode only)
  if (template) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'template-editor-delete-btn';
    deleteBtn.textContent = 'DELETE TEMPLATE';
    deleteBtn.addEventListener('click', async () => {
      if (window.confirm(`Delete "${template.name}"? This cannot be undone.`)) {
        try {
          await deleteTemplate(template);
          navigate('/');
        } catch (error) {
          console.error('Failed to delete template:', error);
          alert('Failed to delete template');
        }
      }
    });
    actionBtns.appendChild(deleteBtn);
  }

  container.appendChild(actionBtns);

  appEl.innerHTML = '';
  appEl.appendChild(container);
}
