/**
 * Render a brutalist card component
 *
 * @param {{ children?: HTMLElement[], shadow?: boolean }} options
 * @returns {HTMLDivElement}
 */
export function renderCard({ children = [], shadow = false }) {
  const card = document.createElement('div');
  card.className = shadow ? 'card card--shadow' : 'card';

  children.forEach(child => {
    card.appendChild(child);
  });

  return card;
}
