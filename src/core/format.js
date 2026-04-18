/**
 * Formatting utilities for Pump
 * Match Swift implementations in the source app
 */

/**
 * Format duration in seconds to display string
 * @param {number} seconds - Duration in seconds
 * @returns {string} e.g., "45 MIN" or "1H 23M"
 */
export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} MIN`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}H ${remainingMinutes}M`;
}

/**
 * Format a strength exercise set
 * @param {{ weight: number|null, reps: number|null }} set
 * @returns {string} e.g., "135 × 8" or "—"
 */
export function formatStrengthSet({ weight, reps }) {
  if (weight === null || weight === undefined || reps === null || reps === undefined) {
    return '—';
  }
  return `${Math.round(weight)} × ${reps}`;
}

/**
 * Format a cardio exercise set
 * @param {{ duration: number|null, speed: number|null, incline: number|null, resistance: number|null }} set
 * @returns {string} e.g., "30 min · 6.5 mph · 2% incline"
 */
export function formatCardioSet({ duration, speed, incline, resistance }) {
  if (duration === null || duration === undefined) {
    return '—';
  }

  const minutes = Math.floor(duration / 60);
  const parts = [`${minutes} min`];

  if (speed !== null && speed !== undefined) {
    parts.push(`${speed} mph`);
  }
  if (incline !== null && incline !== undefined) {
    parts.push(`${incline}% incline`);
  }
  if (resistance !== null && resistance !== undefined) {
    parts.push(`L${resistance}`);
  }

  return parts.join(' · ');
}

/**
 * Format today's date in the style of HomeView.swift
 * @returns {string} e.g., "SATURDAY, APR 18"
 */
export function formatCurrentDate() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  return formatter.format(now).toUpperCase();
}
