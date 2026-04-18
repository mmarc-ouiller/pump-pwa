/**
 * Phase 0 — Seed Data (V2)
 * Initial exercise library and templates for first launch
 */

import { createExercise, fetchExercises, createTemplate, fetchTemplates } from './store.js';

/**
 * Exercise library with body-part types and measurement methods
 * 47 exercises total
 * @type {Array<{name: string, type: BodyPart, measureBy: MeasureBy}>}
 */
const EXERCISE_LIBRARY = [
  // CHEST
  { name: 'Bench Press', type: 'chest', measureBy: 'weight' },
  { name: 'Incline Bench Press', type: 'chest', measureBy: 'weight' },
  { name: 'Dumbbell Press', type: 'chest', measureBy: 'weight' },
  { name: 'Push-ups', type: 'chest', measureBy: 'repsOnly' },
  { name: 'Dips', type: 'chest', measureBy: 'repsOnly' },
  { name: 'Cable Flyes', type: 'chest', measureBy: 'weight' },

  // BACK
  { name: 'Deadlift', type: 'back', measureBy: 'weight' },
  { name: 'Barbell Row', type: 'back', measureBy: 'weight' },
  { name: 'Dumbbell Row', type: 'back', measureBy: 'weight' },
  { name: 'Pull-ups', type: 'back', measureBy: 'repsOnly' },
  { name: 'Chin-ups', type: 'back', measureBy: 'repsOnly' },
  { name: 'Lat Pulldown', type: 'back', measureBy: 'weight' },
  { name: 'Seated Cable Row', type: 'back', measureBy: 'weight' },
  { name: 'Face Pulls', type: 'back', measureBy: 'weight' },
  { name: 'Shrugs', type: 'back', measureBy: 'weight' },

  // SHOULDERS
  { name: 'Overhead Press', type: 'shoulders', measureBy: 'weight' },
  { name: 'Dumbbell Shoulder Press', type: 'shoulders', measureBy: 'weight' },
  { name: 'Lateral Raises', type: 'shoulders', measureBy: 'weight' },

  // BICEPS
  { name: 'Barbell Curl', type: 'biceps', measureBy: 'weight' },
  { name: 'Dumbbell Curl', type: 'biceps', measureBy: 'weight' },
  { name: 'Hammer Curl', type: 'biceps', measureBy: 'weight' },

  // TRICEPS
  { name: 'Tricep Pushdown', type: 'triceps', measureBy: 'weight' },
  { name: 'Skull Crushers', type: 'triceps', measureBy: 'weight' },

  // LEGS
  { name: 'Squat', type: 'legs', measureBy: 'weight' },
  { name: 'Front Squat', type: 'legs', measureBy: 'weight' },
  { name: 'Leg Press', type: 'legs', measureBy: 'weight' },
  { name: 'Romanian Deadlift', type: 'legs', measureBy: 'weight' },
  { name: 'Lunges', type: 'legs', measureBy: 'weight' },
  { name: 'Bulgarian Split Squat', type: 'legs', measureBy: 'weight' },
  { name: 'Leg Extension', type: 'legs', measureBy: 'weight' },
  { name: 'Leg Curl', type: 'legs', measureBy: 'weight' },
  { name: 'Calf Raises', type: 'legs', measureBy: 'weight' },
  { name: 'Hip Thrust', type: 'legs', measureBy: 'weight' },
  { name: 'Goblet Squat', type: 'legs', measureBy: 'weight' },

  // CORE
  { name: 'Plank', type: 'core', measureBy: 'seconds' },
  { name: 'Side Plank', type: 'core', measureBy: 'seconds' },
  { name: 'Hanging Leg Raise', type: 'core', measureBy: 'repsOnly' },
  { name: 'Cable Crunch', type: 'core', measureBy: 'weight' },
  { name: 'Ab Wheel Rollout', type: 'core', measureBy: 'repsOnly' },
  { name: 'Russian Twist', type: 'core', measureBy: 'repsOnly' },
  { name: 'Dead Bug', type: 'core', measureBy: 'repsOnly' },
  { name: 'Bird Dog', type: 'core', measureBy: 'repsOnly' },

  // CARDIO
  { name: 'Treadmill', type: 'cardio', measureBy: 'seconds' },
  { name: 'Elliptical', type: 'cardio', measureBy: 'seconds' },
  { name: 'Stationary Bike', type: 'cardio', measureBy: 'seconds' },
  { name: 'Rowing Machine', type: 'cardio', measureBy: 'seconds' },
  { name: 'Stair Climber', type: 'cardio', measureBy: 'seconds' },
  { name: 'Jump Rope', type: 'cardio', measureBy: 'seconds' },
];

/**
 * Seed templates with fully-populated templateExercises and setGroups
 */
const DEFAULT_TEMPLATES = [
  {
    name: 'Push Day',
    order: 0,
    exercises: [
      {
        name: 'Stair Climber',
        sets: [{ sets: 1, duration: 900 }],
      },
      {
        name: 'Bench Press',
        sets: [{ sets: 4, weight: 155, reps: 8 }],
      },
      {
        name: 'Overhead Press',
        sets: [{ sets: 3, weight: 95, reps: 8 }],
      },
      {
        name: 'Dumbbell Press',
        sets: [{ sets: 3, weight: 50, reps: 10 }],
      },
      {
        name: 'Tricep Pushdown',
        sets: [{ sets: 3, weight: 40, reps: 12 }],
      },
      {
        name: 'Cable Flyes',
        sets: [{ sets: 3, weight: 25, reps: 12 }],
      },
      {
        name: 'Skull Crushers',
        sets: [{ sets: 3, weight: 50, reps: 10 }],
      },
    ],
  },
  {
    name: 'Pull Day',
    order: 1,
    exercises: [
      {
        name: 'Stair Climber',
        sets: [{ sets: 1, duration: 900 }],
      },
      {
        name: 'Lat Pulldown',
        sets: [{ sets: 4, weight: 130, reps: 8 }],
      },
      {
        name: 'Seated Cable Row',
        sets: [{ sets: 3, weight: 120, reps: 10 }],
      },
      {
        name: 'Face Pulls',
        sets: [{ sets: 3, weight: 30, reps: 15 }],
      },
      {
        name: 'Barbell Curl',
        sets: [{ sets: 3, weight: 65, reps: 10 }],
      },
      {
        name: 'Hammer Curl',
        sets: [{ sets: 3, weight: 25, reps: 12 }],
      },
      {
        name: 'Lateral Raises',
        sets: [{ sets: 3, weight: 15, reps: 15 }],
      },
      {
        name: 'Shrugs',
        sets: [{ sets: 3, weight: 60, reps: 12 }],
      },
    ],
  },
  {
    name: 'Leg Day',
    order: 2,
    exercises: [
      {
        name: 'Stair Climber',
        sets: [{ sets: 1, duration: 900 }],
      },
      {
        name: 'Leg Press',
        sets: [{ sets: 4, weight: 270, reps: 8 }],
      },
      {
        name: 'Lunges',
        sets: [{ sets: 3, weight: 35, reps: 10 }],
      },
      {
        name: 'Hip Thrust',
        sets: [{ sets: 3, weight: 185, reps: 10 }],
      },
      {
        name: 'Leg Curl',
        sets: [{ sets: 3, weight: 90, reps: 10 }],
      },
      {
        name: 'Leg Extension',
        sets: [{ sets: 3, weight: 70, reps: 12 }],
      },
      {
        name: 'Calf Raises',
        sets: [{ sets: 3, weight: 60, reps: 15 }],
      },
    ],
  },
  {
    name: 'Core Day',
    order: 3,
    exercises: [
      {
        name: 'Stair Climber',
        sets: [{ sets: 1, duration: 900 }],
      },
      {
        name: 'Plank',
        sets: [{ sets: 3, duration: 45 }],
      },
      {
        name: 'Side Plank',
        sets: [{ sets: 3, duration: 30 }],
      },
      {
        name: 'Hanging Leg Raise',
        sets: [{ sets: 3, reps: 12 }],
      },
      {
        name: 'Cable Crunch',
        sets: [{ sets: 3, weight: 30, reps: 15 }],
      },
      {
        name: 'Ab Wheel Rollout',
        sets: [{ sets: 3, reps: 10 }],
      },
      {
        name: 'Russian Twist',
        sets: [{ sets: 3, reps: 20 }],
      },
      {
        name: 'Dead Bug',
        sets: [{ sets: 3, reps: 10 }],
      },
      {
        name: 'Bird Dog',
        sets: [{ sets: 3, reps: 10 }],
      },
    ],
  },
  {
    name: 'Full Body 1',
    order: 4,
    exercises: [
      {
        name: 'Stair Climber',
        sets: [{ sets: 1, duration: 900 }],
      },
      {
        name: 'Bench Press',
        sets: [{ sets: 3, weight: 135, reps: 10 }],
      },
      {
        name: 'Lat Pulldown',
        sets: [{ sets: 3, weight: 115, reps: 10 }],
      },
      {
        name: 'Overhead Press',
        sets: [{ sets: 3, weight: 80, reps: 10 }],
      },
      {
        name: 'Barbell Curl',
        sets: [{ sets: 3, weight: 55, reps: 12 }],
      },
      {
        name: 'Tricep Pushdown',
        sets: [{ sets: 3, weight: 35, reps: 12 }],
      },
      {
        name: 'Leg Press',
        sets: [{ sets: 3, weight: 225, reps: 12 }],
      },
      {
        name: 'Plank',
        sets: [{ sets: 3, duration: 45 }],
      },
    ],
  },
  {
    name: 'Full Body 2',
    order: 5,
    exercises: [
      {
        name: 'Stair Climber',
        sets: [{ sets: 1, duration: 900 }],
      },
      {
        name: 'Dumbbell Press',
        sets: [{ sets: 3, weight: 50, reps: 10 }],
      },
      {
        name: 'Seated Cable Row',
        sets: [{ sets: 3, weight: 120, reps: 10 }],
      },
      {
        name: 'Lateral Raises',
        sets: [{ sets: 3, weight: 15, reps: 15 }],
      },
      {
        name: 'Hammer Curl',
        sets: [{ sets: 3, weight: 25, reps: 12 }],
      },
      {
        name: 'Skull Crushers',
        sets: [{ sets: 3, weight: 50, reps: 10 }],
      },
      {
        name: 'Hip Thrust',
        sets: [{ sets: 3, weight: 185, reps: 10 }],
      },
      {
        name: 'Leg Curl',
        sets: [{ sets: 3, weight: 90, reps: 10 }],
      },
      {
        name: 'Hanging Leg Raise',
        sets: [{ sets: 3, reps: 12 }],
      },
    ],
  },
  {
    name: 'Full Body 3',
    order: 6,
    exercises: [
      {
        name: 'Stair Climber',
        sets: [{ sets: 1, duration: 900 }],
      },
      {
        name: 'Incline Bench Press',
        sets: [{ sets: 3, weight: 115, reps: 10 }],
      },
      {
        name: 'Dumbbell Row',
        sets: [{ sets: 3, weight: 55, reps: 10 }],
      },
      {
        name: 'Face Pulls',
        sets: [{ sets: 3, weight: 30, reps: 15 }],
      },
      {
        name: 'Dumbbell Curl',
        sets: [{ sets: 3, weight: 25, reps: 12 }],
      },
      {
        name: 'Skull Crushers',
        sets: [{ sets: 3, weight: 50, reps: 10 }],
      },
      {
        name: 'Lunges',
        sets: [{ sets: 3, weight: 35, reps: 10 }],
      },
      {
        name: 'Hip Thrust',
        sets: [{ sets: 3, weight: 185, reps: 10 }],
      },
      {
        name: 'Ab Wheel Rollout',
        sets: [{ sets: 3, reps: 10 }],
      },
    ],
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

    console.log('[seed] Starting database seed...');

    // Seed exercises first
    for (const ex of EXERCISE_LIBRARY) {
      await createExercise({
        ...ex,
        isCustom: false,
      });
    }
    console.log(`[seed] Seeded ${EXERCISE_LIBRARY.length} exercises`);

    // Fetch created exercises to get their IDs
    const allExercises = await fetchExercises();
    const exerciseMap = new Map(allExercises.map(e => [e.name, e]));

    // Seed templates
    for (const templateData of DEFAULT_TEMPLATES) {
      const templateExercises = [];

      for (let exIdx = 0; exIdx < templateData.exercises.length; exIdx++) {
        const exData = templateData.exercises[exIdx];
        const exercise = exerciseMap.get(exData.name);

        if (!exercise) {
          console.warn(`[seed] Exercise not found: ${exData.name}`);
          continue;
        }

        const setGroups = exData.sets.map((sg, sgIdx) => ({
          id: crypto.randomUUID(),
          order: sgIdx,
          sets: sg.sets,
          reps: sg.reps ?? null,
          weight: sg.weight ?? null,
          duration: sg.duration ?? null,
        }));

        templateExercises.push({
          id: crypto.randomUUID(),
          order: exIdx,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          setGroups,
        });
      }

      await createTemplate({
        name: templateData.name,
        templateExercises,
        order: templateData.order,
        isCustom: false,
      });
    }
    console.log(`[seed] Seeded ${DEFAULT_TEMPLATES.length} templates`);
  } catch (error) {
    console.error('[seed] Error seeding database:', error);
  }
}
