/**
 * Phase 1A.1 — Data Store
 * IndexedDB CRUD layer for Pump PWA
 */

import { openDb } from './schema.js';

// ============================================================================
// Exercise CRUD
// ============================================================================

/**
 * Fetch all exercises, optionally filtered by category
 * @param {string} [category] - If provided, filter to this category
 * @returns {Promise<Exercise[]>}
 */
export async function fetchExercises(category = null) {
  try {
    const db = await openDb();
    const store = db.transaction('exercises', 'readonly').objectStore('exercises');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let exercises = request.result;
        // Filter by category if provided
        if (category) {
          exercises = exercises.filter(e => e.category === category);
        }
        // Sort by name
        exercises.sort((a, b) => a.name.localeCompare(b.name));
        resolve(exercises);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('fetchExercises failed:', error);
    return [];
  }
}

/**
 * Create a new custom exercise
 * @param {{ name: string, category: string, type: string }} data
 * @returns {Promise<Exercise>}
 */
export async function createExercise(data) {
  try {
    const db = await openDb();
    const exercise = {
      id: crypto.randomUUID(),
      name: data.name,
      category: data.category,
      type: data.type,
      isCustom: true,
    };

    const store = db.transaction('exercises', 'readwrite').objectStore('exercises');

    return new Promise((resolve, reject) => {
      const request = store.add(exercise);
      request.onsuccess = () => resolve(exercise);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('createExercise failed:', error);
    throw error;
  }
}

// ============================================================================
// Template CRUD
// ============================================================================

/**
 * Fetch all templates, sorted by order field
 * @returns {Promise<Template[]>}
 */
export async function fetchTemplates() {
  try {
    const db = await openDb();
    const store = db.transaction('templates', 'readonly').objectStore('templates');
    const index = store.index('order');

    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => {
        const templates = request.result;
        // Already sorted by order index
        resolve(templates);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('fetchTemplates failed:', error);
    return [];
  }
}

// ============================================================================
// Workout CRUD
// ============================================================================

/**
 * Fetch the active workout (completedAt === null)
 * @returns {Promise<Workout | null>}
 */
export async function fetchActiveWorkout() {
  try {
    const db = await openDb();
    const store = db.transaction('workouts', 'readonly').objectStore('workouts');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const workouts = request.result;
        const active = workouts.find(w => w.completedAt === null);
        resolve(active || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('fetchActiveWorkout failed:', error);
    return null;
  }
}

/**
 * Fetch all completed workouts, sorted by startedAt descending
 * @returns {Promise<Workout[]>}
 */
export async function fetchCompletedWorkouts() {
  try {
    const db = await openDb();
    const store = db.transaction('workouts', 'readonly').objectStore('workouts');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const workouts = request.result;
        const completed = workouts.filter(w => w.completedAt !== null);
        // Sort by startedAt descending
        completed.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
        resolve(completed);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('fetchCompletedWorkouts failed:', error);
    return [];
  }
}

/**
 * Create a new workout
 * @param {{ name: string, templateId?: string }} data
 * @returns {Promise<Workout>}
 */
export async function createWorkout(data) {
  try {
    const db = await openDb();
    const workout = {
      id: crypto.randomUUID(),
      name: data.name,
      templateId: data.templateId || null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      exercises: [],
    };

    const store = db.transaction('workouts', 'readwrite').objectStore('workouts');

    return new Promise((resolve, reject) => {
      const request = store.add(workout);
      request.onsuccess = () => resolve(workout);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('createWorkout failed:', error);
    throw error;
  }
}

/**
 * Create a new workout from a template
 * @param {Template} template
 * @returns {Promise<Workout>}
 */
export async function startWorkoutFromTemplate(template) {
  try {
    // Create the workout
    const workout = await createWorkout({
      name: template.name,
      templateId: template.id,
    });

    // Fetch all exercises to match by name
    const allExercises = await fetchExercises();

    // For each exercise name in template, look it up and create WorkoutExercise
    for (const exerciseName of template.exerciseNames) {
      const exercise = allExercises.find(e => e.name === exerciseName);

      // Create WorkoutExercise with one empty set
      // If exercise not found, defensively use the name string
      const workoutExercise = {
        id: crypto.randomUUID(),
        exerciseId: exercise?.id || null,
        exerciseName: exerciseName,
        exerciseType: exercise?.type || 'strength',
        sets: [createEmptySet()],
      };

      workout.exercises.push(workoutExercise);
    }

    // Save the populated workout
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('startWorkoutFromTemplate failed:', error);
    throw error;
  }
}

/**
 * Mark a workout as completed
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function completeWorkout(workout) {
  try {
    workout.completedAt = new Date().toISOString();
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('completeWorkout failed:', error);
    throw error;
  }
}

/**
 * Delete a workout
 * @param {Workout} workout
 * @returns {Promise<void>}
 */
export async function deleteWorkout(workout) {
  try {
    const db = await openDb();
    const store = db.transaction('workouts', 'readwrite').objectStore('workouts');

    return new Promise((resolve, reject) => {
      const request = store.delete(workout.id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('deleteWorkout failed:', error);
    throw error;
  }
}

/**
 * Save a workout (full overwrite)
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function saveWorkout(workout) {
  try {
    const db = await openDb();
    const store = db.transaction('workouts', 'readwrite').objectStore('workouts');

    return new Promise((resolve, reject) => {
      const request = store.put(workout);
      request.onsuccess = () => resolve(workout);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('saveWorkout failed:', error);
    throw error;
  }
}

// ============================================================================
// Nested Mutation Helpers
// ============================================================================

/**
 * Add a new empty set to a WorkoutExercise
 * @param {Workout} workout
 * @param {string} workoutExerciseId
 * @returns {Promise<Workout>}
 */
export async function addSetTo(workout, workoutExerciseId) {
  try {
    const workoutExercise = workout.exercises.find(e => e.id === workoutExerciseId);
    if (!workoutExercise) {
      throw new Error(`WorkoutExercise ${workoutExerciseId} not found`);
    }

    workoutExercise.sets.push(createEmptySet());
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('addSetTo failed:', error);
    throw error;
  }
}

/**
 * Update a set with new data
 * @param {Workout} workout
 * @param {string} setId
 * @param {{ weight?: number, reps?: number, duration?: number, speed?: number, incline?: number, resistance?: number }} patch
 * @returns {Promise<Workout>}
 */
export async function updateSet(workout, setId, patch) {
  try {
    // Find the set across all exercises
    let found = false;
    for (const workoutExercise of workout.exercises) {
      const set = workoutExercise.sets.find(s => s.id === setId);
      if (set) {
        // Apply patch
        if (patch.weight !== undefined) set.weight = patch.weight;
        if (patch.reps !== undefined) set.reps = patch.reps;
        if (patch.duration !== undefined) set.duration = patch.duration;
        if (patch.speed !== undefined) set.speed = patch.speed;
        if (patch.incline !== undefined) set.incline = patch.incline;
        if (patch.resistance !== undefined) set.resistance = patch.resistance;
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`ExerciseSet ${setId} not found`);
    }

    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('updateSet failed:', error);
    throw error;
  }
}

/**
 * Toggle a set's completion status
 * @param {Workout} workout
 * @param {string} setId
 * @returns {Promise<Workout>}
 */
export async function toggleSetCompleted(workout, setId) {
  try {
    // Find the set across all exercises
    let found = false;
    for (const workoutExercise of workout.exercises) {
      const set = workoutExercise.sets.find(s => s.id === setId);
      if (set) {
        set.isCompleted = !set.isCompleted;
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`ExerciseSet ${setId} not found`);
    }

    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('toggleSetCompleted failed:', error);
    throw error;
  }
}

/**
 * Add an exercise to an active workout
 * @param {Workout} workout
 * @param {Exercise} exercise
 * @returns {Promise<Workout>}
 */
export async function addExerciseToWorkout(workout, exercise) {
  try {
    const workoutExercise = {
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseType: exercise.type,
      sets: [createEmptySet()],
    };

    workout.exercises.push(workoutExercise);
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('addExerciseToWorkout failed:', error);
    throw error;
  }
}

/**
 * Remove an exercise from an active workout
 * @param {Workout} workout
 * @param {string} workoutExerciseId
 * @returns {Promise<Workout>}
 */
export async function removeExerciseFromWorkout(workout, workoutExerciseId) {
  try {
    const index = workout.exercises.findIndex(e => e.id === workoutExerciseId);
    if (index === -1) {
      throw new Error(`WorkoutExercise ${workoutExerciseId} not found`);
    }

    workout.exercises.splice(index, 1);
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('removeExerciseFromWorkout failed:', error);
    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an empty ExerciseSet
 * @returns {ExerciseSet}
 */
function createEmptySet() {
  return {
    id: crypto.randomUUID(),
    weight: null,
    reps: null,
    duration: null,
    speed: null,
    incline: null,
    resistance: null,
    isCompleted: false,
  };
}

// ============================================================================
// Template CRUD
// ============================================================================

/**
 * Create a new template
 * @param {{ name: string, exerciseNames: string[], order?: number }} data
 * @returns {Promise<import('./models.js').Template>}
 */
export async function createTemplate({ name, exerciseNames = [], order = 0 }) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    const template = {
      id: crypto.randomUUID(),
      name,
      exerciseNames,
      order,
    };
    const req = tx.objectStore('templates').add(template);
    tx.oncomplete = () => resolve(template);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Save (overwrite) an existing template
 * @param {import('./models.js').Template} template
 * @returns {Promise<import('./models.js').Template>}
 */
export async function updateTemplate(template) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    tx.objectStore('templates').put(template);
    tx.oncomplete = () => resolve(template);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete a template
 * @param {import('./models.js').Template} template
 * @returns {Promise<void>}
 */
export async function deleteTemplate(template) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    tx.objectStore('templates').delete(template.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================================================
// Exercise CRUD
// ============================================================================

/**
 * Save (overwrite) an existing exercise
 * @param {import('./models.js').Exercise} exercise
 * @returns {Promise<import('./models.js').Exercise>}
 */
export async function updateExercise(exercise) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('exercises', 'readwrite');
    tx.objectStore('exercises').put(exercise);
    tx.oncomplete = () => resolve(exercise);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete an exercise
 * @param {import('./models.js').Exercise} exercise
 * @returns {Promise<void>}
 */
export async function deleteExercise(exercise) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('exercises', 'readwrite');
    tx.objectStore('exercises').delete(exercise.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================================================
// Stats queries
// ============================================================================

/**
 * Fetch all workouts (completed and active), sorted by startedAt descending
 * @returns {Promise<import('./models.js').Workout[]>}
 */
export async function fetchAllWorkouts() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workouts', 'readonly');
    const req = tx.objectStore('workouts').getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      all.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}
