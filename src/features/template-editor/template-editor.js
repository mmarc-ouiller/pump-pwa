import { createTemplate, updateTemplate, deleteTemplate } from '../../core/store.js';
import { openExercisePicker } from '../exercise-picker/exercise-picker.js';
import { renderButton } from '../../components/button.js';

let currentOverlay = null;

/**
 * Open the template editor modal
 * @param {{ template?: any, onSave?: Function }} options
 * @returns {void}
 */
export function openTemplateEditor({ template = null, onSave } = {}) {
  closeTemplateEditor(); // close any existing

  const overlay = document.createElement('div');
  overlay.className = 'template-editor__overlay';
  overlay.id = 'template-editor-overlay';

  const sheet = buildEditorSheet(template, onSave, overlay);
  overlay.appendChild(sheet);

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeTemplateEditor();
  });

  document.body.appendChild(overlay);
  currentOverlay = overlay;

  // Animate in
  requestAnimationFrame(() => overlay.classList.add('template-editor__overlay--open'));
}

/**
 * Close the template editor modal
 * @returns {void}
 */
export function closeTemplateEditor() {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
}

/**
 * Build the editor sheet structure
 * @private
 */
function buildEditorSheet(template, onSave, overlay) {
  const isEdit = !!template;
  // Mutable working copy of the exercise names list
  let exerciseNames = template ? [...template.exerciseNames] : [];

  const sheet = document.createElement('div');
  sheet.className = 'template-editor__sheet';

  // Header
  const header = document.createElement('div');
  header.className = 'template-editor__header';

  const title = document.createElement('h2');
  title.className = 'template-editor__title';
  title.textContent = isEdit ? 'EDIT TEMPLATE' : 'NEW TEMPLATE';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'template-editor__close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', closeTemplateEditor);

  header.appendChild(title);
  header.appendChild(closeBtn);
  sheet.appendChild(header);

  // Name input
  const nameLabel = document.createElement('label');
  nameLabel.className = 'template-editor__label';
  nameLabel.textContent = 'TEMPLATE NAME';
  sheet.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.className = 'template-editor__name-input';
  nameInput.type = 'text';
  nameInput.placeholder = 'E.G. PUSH DAY';
  nameInput.value = template?.name || '';
  sheet.appendChild(nameInput);

  // Exercise list label
  const exLabel = document.createElement('label');
  exLabel.className = 'template-editor__label';
  exLabel.textContent = 'EXERCISES';
  sheet.appendChild(exLabel);

  // Exercise list (re-renderable)
  const exListEl = document.createElement('div');
  exListEl.className = 'template-editor__ex-list';
  sheet.appendChild(exListEl);

  function rerenderExList() {
    exListEl.innerHTML = '';
    if (exerciseNames.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'template-editor__ex-empty';
      empty.textContent = 'NO EXERCISES YET';
      exListEl.appendChild(empty);
      return;
    }
    exerciseNames.forEach((name, idx) => {
      const row = document.createElement('div');
      row.className = 'template-editor__ex-row';

      const nameEl = document.createElement('span');
      nameEl.className = 'template-editor__ex-name';
      nameEl.textContent = name;

      const btns = document.createElement('div');
      btns.className = 'template-editor__ex-btns';

      // Move up
      if (idx > 0) {
        const upBtn = document.createElement('button');
        upBtn.className = 'template-editor__ex-btn';
        upBtn.textContent = '▲';
        upBtn.setAttribute('aria-label', `Move ${name} up`);
        upBtn.addEventListener('click', () => {
          [exerciseNames[idx - 1], exerciseNames[idx]] = [exerciseNames[idx], exerciseNames[idx - 1]];
          rerenderExList();
        });
        btns.appendChild(upBtn);
      }

      // Move down
      if (idx < exerciseNames.length - 1) {
        const downBtn = document.createElement('button');
        downBtn.className = 'template-editor__ex-btn';
        downBtn.textContent = '▼';
        downBtn.setAttribute('aria-label', `Move ${name} down`);
        downBtn.addEventListener('click', () => {
          [exerciseNames[idx], exerciseNames[idx + 1]] = [exerciseNames[idx + 1], exerciseNames[idx]];
          rerenderExList();
        });
        btns.appendChild(downBtn);
      }

      // Remove
      const removeBtn = document.createElement('button');
      removeBtn.className = 'template-editor__ex-btn template-editor__ex-btn--remove';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', `Remove ${name}`);
      removeBtn.addEventListener('click', () => {
        exerciseNames = exerciseNames.filter((_, i) => i !== idx);
        rerenderExList();
      });
      btns.appendChild(removeBtn);

      row.appendChild(nameEl);
      row.appendChild(btns);
      exListEl.appendChild(row);
    });
  }

  rerenderExList();

  // Add exercise button
  const addExBtn = renderButton({
    title: '+ ADD EXERCISE',
    variant: 'outline',
    onClick: () => {
      openExercisePicker({
        onSelect: (exercise) => {
          exerciseNames.push(exercise.name);
          rerenderExList();
        }
      });
    }
  });
  addExBtn.className += ' template-editor__add-ex';
  sheet.appendChild(addExBtn);

  // Save button
  const saveBtn = renderButton({
    title: isEdit ? 'SAVE CHANGES' : 'CREATE TEMPLATE',
    variant: 'solid',
    onClick: async () => {
      const name = nameInput.value.trim();
      if (!name) { alert('Please enter a template name.'); return; }

      let saved;
      if (isEdit) {
        saved = await updateTemplate({ ...template, name, exerciseNames });
      } else {
        saved = await createTemplate({ name, exerciseNames, order: Date.now() });
      }
      closeTemplateEditor();
      if (onSave) onSave(saved);
    }
  });
  saveBtn.className += ' template-editor__save';
  sheet.appendChild(saveBtn);

  // Delete button (edit mode only)
  if (isEdit) {
    const deleteBtn = renderButton({
      title: 'DELETE TEMPLATE',
      variant: 'outline',
      onClick: async () => {
        if (window.confirm(`Delete "${template.name}"? This cannot be undone.`)) {
          await deleteTemplate(template);
          closeTemplateEditor();
          if (onSave) onSave(null);
        }
      }
    });
    deleteBtn.className += ' template-editor__delete';
    sheet.appendChild(deleteBtn);
  }

  return sheet;
}
