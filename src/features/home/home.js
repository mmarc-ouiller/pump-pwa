import { fetchTemplates, fetchActiveWorkout, createWorkout, startWorkoutFromTemplate } from '../../core/store.js';
import { formatCurrentDate, formatDuration } from '../../core/format.js';
import { renderButton } from '../../components/button.js';
import { renderCard } from '../../components/card.js';
import { navigate } from '../../core/router.js';
import { openTemplateEditor } from '../template-editor/template-editor.js';

let durationInterval = null; // for the live-ticking duration on active workout

/**
 * Render the Home view
 * @param {HTMLElement} appEl - The #app container to render into
 * @returns {Promise<void>}
 */
export async function renderHome(appEl) {
  // Clear any existing interval
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }

  // Load data
  const [templates, activeWorkout] = await Promise.all([
    fetchTemplates(),
    fetchActiveWorkout()
  ]);

  // Render
  appEl.innerHTML = '';
  appEl.appendChild(buildHomeView(templates, activeWorkout));

  // If there's an active workout, tick the duration every second
  if (activeWorkout) {
    const durationEl = appEl.querySelector('.home__duration');
    if (durationEl) {
      durationInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(activeWorkout.startedAt).getTime()) / 1000);
        durationEl.textContent = formatDuration(elapsed);
      }, 1000);
    }
  }
}

/**
 * Build the home view structure
 * @param {Template[]} templates
 * @param {Workout | null} activeWorkout
 * @returns {HTMLDivElement}
 */
function buildHomeView(templates, activeWorkout) {
  const container = document.createElement('div');
  container.className = 'home';

  // Header
  const header = document.createElement('div');
  header.className = 'home__header';
  header.innerHTML = `
    <h1 class="home__title">WORKOUT</h1>
    <p class="home__date">${formatCurrentDate()}</p>
  `;
  container.appendChild(header);

  // Active workout card (if exists)
  if (activeWorkout) {
    container.appendChild(buildActiveWorkoutCard(activeWorkout));
  }

  // Quick Start (hidden if active workout)
  if (!activeWorkout) {
    const quickStart = renderButton({
      title: 'QUICK START',
      variant: 'solid',
      onClick: async () => {
        const workout = await createWorkout({ name: 'Workout' });
        navigate(`/workout/${workout.id}`);
      }
    });
    quickStart.className += ' home__quick-start';
    container.appendChild(quickStart);
  }

  // Templates section
  const templatesSection = document.createElement('div');
  templatesSection.className = 'home__templates';
  const templatesHeading = document.createElement('h2');
  templatesHeading.className = 'home__section-title';
  templatesHeading.textContent = 'TEMPLATES';
  templatesSection.appendChild(templatesHeading);

  templates.forEach(template => {
    templatesSection.appendChild(buildTemplateCard(template, activeWorkout));
  });

  const newTemplateBtn = renderButton({
    title: '+ NEW TEMPLATE',
    variant: 'outline',
    onClick: () => {
      openTemplateEditor({
        template: null,
        onSave: () => {
          const appEl = document.getElementById('app');
          renderHome(appEl);
        }
      });
    }
  });
  newTemplateBtn.className += ' home__new-template-btn';
  templatesSection.appendChild(newTemplateBtn);

  container.appendChild(templatesSection);

  return container;
}

/**
 * Build the active workout card
 * @param {Workout} activeWorkout
 * @returns {HTMLDivElement}
 */
function buildActiveWorkoutCard(activeWorkout) {
  const elapsed = Math.floor((Date.now() - new Date(activeWorkout.startedAt).getTime()) / 1000);

  const content = document.createElement('div');
  content.innerHTML = `
    <div class="home__active-label">ACTIVE WORKOUT</div>
    <div class="home__active-name">${activeWorkout.name}</div>
    <div class="home__duration">${formatDuration(elapsed)}</div>
  `;

  const continueBtn = renderButton({
    title: 'CONTINUE',
    variant: 'solid',
    onClick: () => navigate(`/workout/${activeWorkout.id}`)
  });
  content.appendChild(continueBtn);

  const card = renderCard({ children: [content], shadow: true });
  card.className += ' home__active-card';
  return card;
}

/**
 * Build a template card
 * @param {Template} template
 * @param {Workout | null} activeWorkout
 * @returns {HTMLDivElement}
 */
function buildTemplateCard(template, activeWorkout) {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="home__template-name">${template.name}</div>
    <div class="home__template-count">${template.exerciseNames.length} EXERCISES</div>
  `;

  const btnsContainer = document.createElement('div');
  btnsContainer.className = 'home__template-btns';

  const startBtn = renderButton({
    title: 'START',
    variant: 'outline',
    disabled: !!activeWorkout,
    onClick: async () => {
      const workout = await startWorkoutFromTemplate(template);
      navigate(`/workout/${workout.id}`);
    }
  });
  btnsContainer.appendChild(startBtn);

  const editBtn = renderButton({
    title: 'EDIT',
    variant: 'outline',
    onClick: (e) => {
      e.stopPropagation();
      openTemplateEditor({
        template,
        onSave: () => {
          // re-render home after save/delete
          const appEl = document.getElementById('app');
          renderHome(appEl);
        }
      });
    }
  });
  editBtn.className += ' home__template-edit-btn';
  btnsContainer.appendChild(editBtn);

  content.appendChild(btnsContainer);

  const card = renderCard({ children: [content] });
  card.className += ' home__template-card';
  return card;
}

