/**
 * Render a card component
 *
 * @param {{ children?: HTMLElement[], shadow?: 'sm'|'md'|'lg'|boolean }} options
 * @returns {HTMLDivElement}
 */
export function renderCard({ children = [], shadow = false }) {
  const card = document.createElement('div');
  let className = 'card';

  if (shadow === true) {
    className += ' card--shadow-md';
  } else if (shadow === 'sm' || shadow === 'md' || shadow === 'lg') {
    className += ` card--shadow-${shadow}`;
  }

  card.className = className;

  children.forEach(child => {
    card.appendChild(child);
  });

  return card;
}
