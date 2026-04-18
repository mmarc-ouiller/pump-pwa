/**
 * Render a button component
 *
 * @param {{ title: string, variant?: 'solid'|'outline'|'primary'|'secondary'|'destructive'|'ghost', onClick?: Function, disabled?: boolean }} options
 * @returns {HTMLButtonElement}
 */
export function renderButton({ title, variant = 'primary', onClick, disabled = false }) {
  const btn = document.createElement('button');
  btn.textContent = title;
  btn.className = `btn btn--${variant}`;
  btn.disabled = disabled;

  if (onClick) {
    btn.addEventListener('click', onClick);
  }

  return btn;
}
