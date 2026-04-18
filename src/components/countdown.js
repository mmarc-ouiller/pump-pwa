/**
 * Phase 1G — Countdown Component
 * Fullscreen 3/2/1 countdown with animated number and SVG ring
 * Used before starting a workout from a template
 */

let currentOverlay = null;
let countdownInterval = null;

/**
 * Show a fullscreen countdown overlay
 * @param {{ seconds?: number, onComplete?: Function }} options
 * @returns {void}
 */
export function showCountdown({ seconds = 3, onComplete } = {}) {
  // Guard against double-mount
  if (currentOverlay) {
    dismissCountdown();
  }

  const overlay = document.createElement('div');
  overlay.className = 'countdown-overlay';

  const container = document.createElement('div');
  container.className = 'countdown-container';

  // SVG ring background
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'countdown-ring');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', '200');
  svg.setAttribute('height', '200');

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '50');
  circle.setAttribute('cy', '50');
  circle.setAttribute('r', '45');
  circle.setAttribute('class', 'countdown-ring-stroke');

  svg.appendChild(circle);
  container.appendChild(svg);

  // Number display
  const numberEl = document.createElement('div');
  numberEl.className = 'countdown-number';
  numberEl.textContent = seconds.toString();
  container.appendChild(numberEl);

  overlay.appendChild(container);
  document.body.appendChild(overlay);

  currentOverlay = overlay;

  // Trigger initial animation
  requestAnimationFrame(() => {
    overlay.classList.add('countdown-overlay--active');
  });

  // Countdown logic
  let remaining = seconds;

  function tick() {
    remaining--;

    if (remaining > 0) {
      // Update number and trigger scale animation
      numberEl.textContent = remaining.toString();
      numberEl.classList.remove('countdown-number--pop');
      // Trigger reflow to restart animation
      void numberEl.offsetWidth;
      numberEl.classList.add('countdown-number--pop');
    } else {
      // Done
      clearInterval(countdownInterval);
      countdownInterval = null;

      dismissCountdown();
      if (onComplete) {
        onComplete();
      }
    }
  }

  // Start ticking
  countdownInterval = setInterval(tick, 1000);
}

/**
 * Dismiss the countdown overlay without firing onComplete
 * @returns {void}
 */
export function dismissCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  if (currentOverlay) {
    currentOverlay.classList.remove('countdown-overlay--active');
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
