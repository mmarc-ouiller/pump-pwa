/**
 * Phase 1G — Template Details Sheet
 * Bottom sheet overlay showing template info with START, EDIT, DUPLICATE actions
 */

import { showCountdown } from '../../components/countdown.js';

let currentOverlay = null;

/**
 * Show the template details sheet
 * @param {Template} template
 * @param {{ activeWorkoutExists: boolean, onStart: Function, onEdit: Function, onDuplicate: Function }} options
 * @returns {void}
 */
export function showTemplateDetails(template, { activeWorkoutExists, onStart, onEdit, onDuplicate }) {
  dismissTemplateDetails();

  const overlay = document.createElement('div');
  overlay.className = 'template-details-overlay';

  const sheet = document.createElement('div');
  sheet.className = 'template-details-sheet';

  // Header: template name
  const header = document.createElement('div');
  header.className = 'template-details-header';

  const title = document.createElement('h2');
  title.className = 'template-details-title';
  title.textContent = template.name;
  header.appendChild(title);

  sheet.appendChild(header);

  // Count exercises and total sets
  const exerciseCount = template.templateExercises?.length || 0;
  let totalSets = 0;
  if (template.templateExercises) {
    template.templateExercises.forEach(ex => {
      if (ex.setGroups) {
        ex.setGroups.forEach(sg => {
          totalSets += sg.sets || 0;
        });
      }
    });
  }

  const stats = document.createElement('p');
  stats.className = 'template-details-stats';
  stats.textContent = `${exerciseCount} ${exerciseCount === 1 ? 'EXERCISE' : 'EXERCISES'} · ${totalSets} TOTAL SETS`;
  sheet.appendChild(stats);

  // Exercise preview
  const preview = document.createElement('div');
  preview.className = 'template-details-preview';

  const exerciseNames = template.templateExercises?.map(ex => ex.exerciseName) || [];
  const displayCount = Math.min(6, exerciseNames.length);

  for (let i = 0; i < displayCount; i++) {
    const item = document.createElement('div');
    item.className = 'template-details-preview-item';
    item.textContent = exerciseNames[i];
    preview.appendChild(item);
  }

  if (exerciseNames.length > 6) {
    const more = document.createElement('div');
    more.className = 'template-details-preview-more';
    more.textContent = `+${exerciseNames.length - 6} MORE`;
    preview.appendChild(more);
  }

  sheet.appendChild(preview);

  // Action buttons
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'template-details-buttons';

  // START button
  const startBtn = document.createElement('button');
  startBtn.className = 'template-details-btn template-details-btn--start';
  startBtn.textContent = 'START';
  startBtn.disabled = activeWorkoutExists;
  startBtn.addEventListener('click', () => {
    dismissTemplateDetails();
    showCountdown({
      seconds: 3,
      onComplete: () => {
        if (onStart) onStart(template);
      }
    });
  });
  buttonGroup.appendChild(startBtn);

  // EDIT button
  const editBtn = document.createElement('button');
  editBtn.className = 'template-details-btn template-details-btn--edit';
  editBtn.textContent = 'EDIT';
  editBtn.addEventListener('click', () => {
    dismissTemplateDetails();
    if (onEdit) onEdit(template);
  });
  buttonGroup.appendChild(editBtn);

  // DUPLICATE button
  const dupBtn = document.createElement('button');
  dupBtn.className = 'template-details-btn template-details-btn--duplicate';
  dupBtn.textContent = 'DUPLICATE';
  dupBtn.addEventListener('click', () => {
    dismissTemplateDetails();
    if (onDuplicate) onDuplicate(template);
  });
  buttonGroup.appendChild(dupBtn);

  sheet.appendChild(buttonGroup);

  overlay.appendChild(sheet);

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismissTemplateDetails();
  });

  document.body.appendChild(overlay);
  currentOverlay = overlay;

  // Trigger animation
  requestAnimationFrame(() => overlay.classList.add('template-details-overlay--open'));
}

/**
 * Dismiss the template details sheet
 * @returns {void}
 */
export function dismissTemplateDetails() {
  if (currentOverlay) {
    currentOverlay.classList.remove('template-details-overlay--open');
    setTimeout(() => {
      if (currentOverlay && currentOverlay.parentNode) {
        currentOverlay.remove();
      }
      currentOverlay = null;
    }, 150);
  } else {
    currentOverlay = null;
  }
}
