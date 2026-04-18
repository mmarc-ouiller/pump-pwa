/**
 * Card Stack Component (Horizontal Scroll Carousel)
 * Renders a carousel of template cards with long-press action sheet
 */

/**
 * Render a horizontal scrollable card stack
 * @param {HTMLElement} container - DOM element to render into
 * @param {Template[]} templates - Array of templates to display
 * @param {Object} handlers
 * @param {Function} handlers.onStart - Called when card is tapped: (template) => void
 * @param {Function} handlers.onEdit - Called from action sheet: (template) => void
 * @param {Function} handlers.onDuplicate - Called from action sheet: (template) => void
 * @param {Function} handlers.onDelete - Called from action sheet: (template) => void
 * @param {boolean} handlers.activeWorkoutExists - True if there's an active workout
 * @param {Object} completedCounts - Map of { [templateId]: number }
 * @returns {void}
 */
export function renderCardStack(container, templates, handlers, completedCounts = {}) {
  container.innerHTML = '';

  const stackContainer = document.createElement('div');
  stackContainer.className = 'card-stack';

  templates.forEach(template => {
    const card = buildTemplateCard(template, handlers, completedCounts[template.id] || 0);
    stackContainer.appendChild(card);
  });

  container.appendChild(stackContainer);
}

/**
 * Build an individual template card
 * @param {Template} template
 * @param {Object} handlers
 * @param {number} completionCount
 * @returns {HTMLDivElement}
 */
function buildTemplateCard(template, handlers, completionCount) {
  const card = document.createElement('div');
  card.className = 'card-stack__card';

  // Title
  const title = document.createElement('div');
  title.className = 'card-stack__title';
  title.textContent = template.name;
  card.appendChild(title);

  // Exercise count
  const exerciseCount = template.templateExercises?.length || 0;
  const countEl = document.createElement('div');
  countEl.className = 'card-stack__exercise-count';
  countEl.textContent = `${exerciseCount} EXERCISE${exerciseCount !== 1 ? 'S' : ''}`;
  card.appendChild(countEl);

  // Exercise preview (first 6 names joined by " · " with "+N MORE" if needed)
  const previewNames = template.templateExercises
    ?.slice(0, 6)
    .map(te => te.exerciseName) || [];
  let previewText = previewNames.join(' · ');
  if (exerciseCount > 6) {
    previewText += ` +${exerciseCount - 6} MORE`;
  }
  const preview = document.createElement('div');
  preview.className = 'card-stack__preview';
  preview.textContent = previewText;
  card.appendChild(preview);

  // Completion count
  const completed = document.createElement('div');
  completed.className = 'card-stack__completed';
  completed.textContent = `Completed ${completionCount} time${completionCount !== 1 ? 's' : ''}`;
  card.appendChild(completed);

  // Long-press and tap handlers
  let pointerDownTime = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pressTimer = null;
  let isPressed = false;

  card.addEventListener('pointerdown', (e) => {
    pointerDownTime = Date.now();
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    isPressed = false;

    // Start long-press timer (500ms)
    pressTimer = setTimeout(() => {
      isPressed = true;
      showActionSheet(template, handlers);
    }, 500);
  });

  card.addEventListener('pointermove', (e) => {
    // Cancel if pointer moved significantly
    const dx = Math.abs(e.clientX - pointerStartX);
    const dy = Math.abs(e.clientY - pointerStartY);
    if (dx > 10 || dy > 10) {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      isPressed = false;
    }
  });

  card.addEventListener('pointerup', (e) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }

    // Single tap (< 500ms, no significant movement)
    if (!isPressed) {
      const duration = Date.now() - pointerDownTime;
      const dx = Math.abs(e.clientX - pointerStartX);
      const dy = Math.abs(e.clientY - pointerStartY);

      if (duration < 500 && dx < 10 && dy < 10) {
        handlers.onStart(template);
      }
    }
  });

  card.addEventListener('pointercancel', () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    isPressed = false;
  });

  return card;
}

/**
 * Show action sheet overlay with Edit / Duplicate / Delete
 * @param {Template} template
 * @param {Object} handlers
 * @returns {void}
 */
function showActionSheet(template, handlers) {
  // Create overlay background
  const overlay = document.createElement('div');
  overlay.className = 'card-stack__action-overlay';

  // Create action sheet
  const sheet = document.createElement('div');
  sheet.className = 'card-stack__action-sheet';

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'card-stack__action-btn';
  editBtn.textContent = 'EDIT';
  editBtn.addEventListener('click', () => {
    handlers.onEdit(template);
    dismissSheet();
  });
  sheet.appendChild(editBtn);

  // Duplicate button
  const duplicateBtn = document.createElement('button');
  duplicateBtn.className = 'card-stack__action-btn';
  duplicateBtn.textContent = 'DUPLICATE';
  duplicateBtn.addEventListener('click', () => {
    handlers.onDuplicate(template);
    dismissSheet();
  });
  sheet.appendChild(duplicateBtn);

  // Delete button (styled as danger)
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'card-stack__action-btn card-stack__action-btn--delete';
  deleteBtn.textContent = 'DELETE';
  deleteBtn.addEventListener('click', () => {
    handlers.onDelete(template);
    dismissSheet();
  });
  sheet.appendChild(deleteBtn);

  overlay.appendChild(sheet);

  // Dismiss on outside click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      dismissSheet();
    }
  });

  function dismissSheet() {
    overlay.remove();
  }

  document.body.appendChild(overlay);
}
