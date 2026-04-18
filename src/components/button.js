/**
 * Render a brutalist button component
 *
 * @param {{ title: string, variant?: 'solid'|'outline', onClick?: Function, disabled?: boolean }} options
 * @returns {HTMLButtonElement}
 */
export function renderButton({ title, variant = 'solid', onClick, disabled = false }) {
  const btn = document.createElement('button');
  btn.textContent = title;
  btn.className = `btn btn--${variant}`;
  btn.disabled = disabled;

  if (onClick) {
    btn.addEventListener('click', onClick);
  }

  return btn;
}
