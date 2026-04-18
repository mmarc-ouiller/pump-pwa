/**
 * Render a brutalist text input component
 *
 * @param {{ placeholder: string, value?: string, type?: string, inputMode?: string, onInput: Function }} options
 * @returns {HTMLInputElement}
 */
export function renderTextField({ placeholder, value = '', type = 'text', inputMode, onInput }) {
  const input = document.createElement('input');
  input.className = 'textfield';
  input.type = type;
  input.placeholder = placeholder;
  input.value = value;

  if (inputMode) {
    input.inputMode = inputMode;
  }

  if (onInput) {
    input.addEventListener('input', e => {
      onInput(e.target.value);
    });
  }

  return input;
}
