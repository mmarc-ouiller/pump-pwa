/**
 * Phase 1A.2 — Seed Data
 * Initial exercise library and templates for first launch
 */

import { fetchExercises, createExercise, fetchTemplates } from './store.js';
import { openDb } from './schema.js';

/**
 * Full exercise library from ExerciseLibrary.swift
 * Each exercise has: name, category ('push'|'pull'|'legs'|'core'|'cardio'), type ('strength'|'cardio')
 * @type {Array<{name: string, category: string, type: string}>}
 */
const EXERCISE_LIBRARY = [
  // PUSH
  { name: 'Bench Press', category: 'push', type: 'strength' },
  { name: 'Incline Bench Press', category: 'push', type: 'strength' },
  { name: 'Dumbbell Press', category: 'push', type: 'strength' },
  { name: 'Overhead Press', category: 'push', type: 'strength' },
  { name: 'Dumbbell Shoulder Press', category: 'push', type: 'strength' },
  { name: 'Push-ups', category: 'push', type: 'strength' },
  { name: 'Dips', category: 'push', type: 'strength' },
  { name: 'Tricep Pushdown', category: 'push', type: 'strength' },
  { name: 'Skull Crushers', category: 'push', type: 'strength' },
  { name: 'Lateral Raises', category: 'push', type: 'strength' },
  { name: 'Cable Flyes', category: 'push', type: 'strength' },

  // PULL
  { name: 'Deadlift', category: 'pull', type: 'strength' },
  { name: 'Barbell Row', category: 'pull', type: 'strength' },
  { name: 'Dumbbell Row', category: 'pull', type: 'strength' },
  { name: 'Pull-ups', category: 'pull', type: 'strength' },
  { name: 'Chin-ups', category: 'pull', type: 'strength' },
  { name: 'Lat Pulldown', category: 'pull', type: 'strength' },
  { name: 'Seated Cable Row', category: 'pull', type: 'strength' },
  { name: 'Face Pulls', category: 'pull', type: 'strength' },
  { name: 'Barbell Curl', category: 'pull', type: 'strength' },
  { name: 'Dumbbell Curl', category: 'pull', type: 'strength' },
  { name: 'Hammer Curl', category: 'pull', type: 'strength' },
  { name: 'Shrugs', category: 'pull', type: 'strength' },

  // LEGS
  { name: 'Squat', category: 'legs', type: 'strength' },
  { name: 'Front Squat', category: 'legs', type: 'strength' },
  { name: 'Leg Press', category: 'legs', type: 'strength' },
  { name: 'Romanian Deadlift', category: 'legs', type: 'strength' },
  { name: 'Lunges', category: 'legs', type: 'strength' },
  { name: 'Bulgarian Split Squat', category: 'legs', type: 'strength' },
  { name: 'Leg Extension', category: 'legs', type: 'strength' },
  { name: 'Leg Curl', category: 'legs', type: 'strength' },
  { name: 'Calf Raises', category: 'legs', type: 'strength' },
  { name: 'Hip Thrust', category: 'legs', type: 'strength' },
  { name: 'Goblet Squat', category: 'legs', type: 'strength' },

  // CORE
  { name: 'Plank', category: 'core', type: 'strength' },
  { name: 'Hanging Leg Raise', category: 'core', type: 'strength' },
  { name: 'Cable Crunch', category: 'core', type: 'strength' },
  { name: 'Ab Wheel Rollout', category: 'core', type: 'strength' },
  { name: 'Russian Twist', category: 'core', type: 'strength' },
  { name: 'Dead Bug', category: 'core', type: 'strength' },
  { name: 'Bird Dog', category: 'core', type: 'strength' },
  { name: 'Side Plank', category: 'core', type: 'strength' },

  // CARDIO
  { name: 'Treadmill', category: 'cardio', type: 'cardio' },
  { name: 'Elliptical', category: 'cardio', type: 'cardio' },
  { name: 'Stationary Bike', category: 'cardio', type: 'cardio' },
  { name: 'Rowing Machine', category: 'cardio', type: 'cardio' },
  { name: 'Stair Climber', category: 'cardio', type: 'cardio' },
  { name: 'Jump Rope', category: 'cardio', type: 'cardio' },
];

/**
 * Default templates matching ExerciseLibrary.swift
 * @type {Array<{name: string, order: number, exerciseNames: Array<string>}>}
 */
const DEFAULT_TEMPLATES = [
  {
    name: 'Push Day',
    order: 0,
    exerciseNames: ['Bench Press', 'Overhead Press', 'Dumbbell Press', 'Tricep Pushdown', 'Lateral Raises'],
  },
  {
    name: 'Pull Day',
    order: 1,
    exerciseNames: ['Deadlift', 'Barbell Row', 'Pull-ups', 'Face Pulls', 'Barbell Curl'],
  },
  {
    name: 'Leg Day',
    order: 2,
    exerciseNames: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raises'],
  },
  {
    name: 'Core Day',
    order: 3,
    exerciseNames: ['Plank', 'Hanging Leg Raise', 'Cable Crunch', 'Russian Twist'],
  },
];

/**
 * Seed initial data if database is empty
 * - Creates all exercises from EXERCISE_LIBRARY
 * - Creates default templates from DEFAULT_TEMPLATES
 * Idempotent: safe to call multiple times (only seeds if exercises are empty)
 * @returns {Promise<void>}
 */
export async function seedIfNeeded() {
  try {
    const existing = await fetchExercises();
    if (existing.length > 0) {
      // Already seeded
      return;
    }

    // Seed exercises first
    for (const ex of EXERCISE_LIBRARY) {
      await createExercise(ex);
    }

    // Seed templates
    for (const tmpl of DEFAULT_TEMPLATES) {
      await createTemplate(tmpl);
    }
  } catch (error) {
    console.error('[seed] Error seeding database:', error);
  }
}

/**
 * Create a template in the templates object store
 * @param {{name: string, order: number, exerciseNames: Array<string>}} template
 * @returns {Promise<{id: string, name: string, order: number, exerciseNames: Array<string>}>}
 */
async function createTemplate({ name, order, exerciseNames }) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');
    const template = {
      id: crypto.randomUUID(),
      name,
      order,
      exerciseNames,
    };

    const req = store.add(template);
    req.onerror = () => reject(req.error);

    tx.oncomplete = () => resolve(template);
    tx.onerror = () => reject(tx.error);
  });
}
