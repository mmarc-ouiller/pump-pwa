/**
 * Phase 0 — Data Store (V2)
 * IndexedDB CRUD layer for Pump PWA
 */

import { openDb } from './schema.js';

// ============================================================================
// Exercise CRUD
// ============================================================================

/**
 * Fetch all exercises, optionally filtered by body-part type
 * @param {string} [type] - If provided, filter to this body-part type
 * @returns {Promise<Exercise[]>}
 */
export async function fetchExercises(type = null) {
  try {
    const db = await openDb();
    const store = db.transaction('exercises', 'readonly').objectStore('exercises');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let exercises = request.result;
        // Filter by type if provided
        if (type) {
          exercises = exercises.filter(e => e.type === type);
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
 * @param {{ name: string, type: BodyPart, measureBy: MeasureBy }} data
 * @returns {Promise<Exercise>}
 */
export async function createExercise(data) {
  try {
    const db = await openDb();
    const exercise = {
      id: crypto.randomUUID(),
      name: data.name,
      type: data.type,
      measureBy: data.measureBy,
      isCustom: data.isCustom ?? true,
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

/**
 * Update an existing exercise
 * @param {Exercise} exercise
 * @returns {Promise<Exercise>}
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
 * @param {Exercise} exercise
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

/**
 * Create a new template
 * @param {{ name: string, templateExercises: TemplateExercise[], order?: number, isCustom?: boolean }} data
 * @returns {Promise<Template>}
 */
export async function createTemplate({ name, templateExercises = [], order = 0, isCustom = true }) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    const template = {
      id: crypto.randomUUID(),
      name,
      templateExercises,
      order,
      isCustom,
    };
    const req = tx.objectStore('templates').add(template);
    tx.oncomplete = () => resolve(template);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Update an existing template
 * @param {Template} template
 * @returns {Promise<Template>}
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
 * @param {Template} template
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

/**
 * Duplicate a template (deep copy with "Copy of X" naming)
 * @param {Template} template
 * @returns {Promise<Template>}
 */
export async function duplicateTemplate(template) {
  // Find the next available copy number
  const allTemplates = await fetchTemplates();
  const copyPattern = new RegExp(`^Copy of ${template.name}(?: (\\d+))?$`);
  let maxNum = 0;
  for (const t of allTemplates) {
    const match = t.name.match(copyPattern);
    if (match) {
      const num = match[1] ? parseInt(match[1], 10) : 1;
      maxNum = Math.max(maxNum, num);
    }
  }
  const newName = maxNum === 0 ? `Copy of ${template.name}` : `Copy of ${template.name} ${maxNum + 1}`;

  // Deep copy templateExercises
  const copiedExercises = template.templateExercises.map(te => ({
    id: crypto.randomUUID(),
    order: te.order,
    exerciseId: te.exerciseId,
    exerciseName: te.exerciseName,
    setGroups: te.setGroups.map(sg => ({
      id: crypto.randomUUID(),
      order: sg.order,
      sets: sg.sets,
      reps: sg.reps,
      weight: sg.weight,
      duration: sg.duration,
    })),
  }));

  return createTemplate({
    name: newName,
    templateExercises: copiedExercises,
    order: template.order,
    isCustom: true,
  });
}

// ============================================================================
// Workout CRUD
// ============================================================================

/**
 * Fetch the active workout (one where completedAt === null and startedAt !== null)
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
        // Active = started but not completed
        const active = workouts.find(w => w.startedAt !== null && w.completedAt === null);
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
 * Fetch all workouts (completed and active), sorted by startedAt descending
 * @returns {Promise<Workout[]>}
 */
export async function fetchAllWorkouts() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workouts', 'readonly');
    const req = tx.objectStore('workouts').getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      all.sort((a, b) => new Date(b.startedAt || b.createdAt) - new Date(a.startedAt || a.createdAt));
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Create a new workout in planning mode
 * @param {{ name: string, templateId?: string }} data
 * @returns {Promise<Workout>}
 */
export async function createWorkout(data) {
  try {
    const db = await openDb();
    const now = new Date().toISOString();
    const workout = {
      id: crypto.randomUUID(),
      name: data.name,
      templateId: data.templateId || null,
      createdAt: now,
      startedAt: null, // Planning mode starts with null
      completedAt: null,
      pausedAt: null,
      totalPausedDuration: 0,
      hasBeenEdited: false,
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
 * Start a planning-mode workout (sets startedAt)
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function startWorkout(workout) {
  try {
    workout.startedAt = new Date().toISOString();
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('startWorkout failed:', error);
    throw error;
  }
}

/**
 * Pause a running workout
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function pauseWorkout(workout) {
  try {
    workout.pausedAt = new Date().toISOString();
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('pauseWorkout failed:', error);
    throw error;
  }
}

/**
 * Resume a paused workout
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function resumeWorkout(workout) {
  try {
    if (workout.pausedAt) {
      const pauseStart = new Date(workout.pausedAt).getTime();
      const pauseEnd = new Date().getTime();
      const pausedDuration = Math.floor((pauseEnd - pauseStart) / 1000);
      workout.totalPausedDuration += pausedDuration;
      workout.pausedAt = null;
    }
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('resumeWorkout failed:', error);
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

/**
 * Update workout name and mark as edited if in planning mode
 * @param {Workout} workout
 * @param {string} name
 * @returns {Promise<Workout>}
 */
export async function updateWorkoutName(workout, name) {
  try {
    workout.name = name;
    if (workout.startedAt === null) {
      // In planning mode, mark as edited
      workout.hasBeenEdited = true;
    }
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('updateWorkoutName failed:', error);
    throw error;
  }
}

/**
 * Update workout dates (for history editing)
 * @param {Workout} workout
 * @param {string|null} startedAt
 * @param {string|null} completedAt
 * @returns {Promise<Workout>}
 */
export async function updateWorkoutDates(workout, startedAt, completedAt) {
  try {
    workout.startedAt = startedAt;
    workout.completedAt = completedAt;
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('updateWorkoutDates failed:', error);
    throw error;
  }
}

/**
 * Mark a workout as edited
 * @param {Workout} workout
 * @returns {Promise<Workout>}
 */
export async function markWorkoutAsEdited(workout) {
  try {
    workout.hasBeenEdited = true;
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('markWorkoutAsEdited failed:', error);
    throw error;
  }
}

// ============================================================================
// Workout Exercise Mutations
// ============================================================================

/**
 * Add an exercise to a workout
 * @param {Workout} workout
 * @param {Exercise} exercise
 * @returns {Promise<Workout>}
 */
export async function addExerciseToWorkout(workout, exercise) {
  try {
    const workoutExercise = {
      id: crypto.randomUUID(),
      order: workout.exercises.length,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      measureBy: exercise.measureBy,
      sets: [createEmptySet(0)],
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
 * Remove an exercise from a workout
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
    // Reorder remaining exercises
    for (let i = 0; i < workout.exercises.length; i++) {
      workout.exercises[i].order = i;
    }
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('removeExerciseFromWorkout failed:', error);
    throw error;
  }
}

/**
 * Reorder exercises in a workout
 * @param {Workout} workout
 * @param {WorkoutExercise[]} orderedExercises
 * @returns {Promise<Workout>}
 */
export async function reorderExercises(workout, orderedExercises) {
  try {
    for (let i = 0; i < orderedExercises.length; i++) {
      orderedExercises[i].order = i;
    }
    workout.exercises = orderedExercises;
    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('reorderExercises failed:', error);
    throw error;
  }
}

// ============================================================================
// Set Mutations
// ============================================================================

/**
 * Add a new set to a WorkoutExercise (copies values from previous set if it exists)
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

    const newOrder = workoutExercise.sets.length;
    let newSet;

    if (workoutExercise.sets.length > 0) {
      // Copy from last set
      const lastSet = workoutExercise.sets[workoutExercise.sets.length - 1];
      newSet = {
        id: crypto.randomUUID(),
        order: newOrder,
        weight: lastSet.weight,
        reps: lastSet.reps,
        duration: lastSet.duration,
        speed: lastSet.speed,
        incline: lastSet.incline,
        resistance: lastSet.resistance,
        isCompleted: false,
      };
    } else {
      newSet = createEmptySet(newOrder);
    }

    workoutExercise.sets.push(newSet);
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
 * Delete a specific set
 * @param {Workout} workout
 * @param {string} workoutExerciseId
 * @param {string} setId
 * @returns {Promise<Workout>}
 */
export async function deleteSet(workout, workoutExerciseId, setId) {
  try {
    const workoutExercise = workout.exercises.find(e => e.id === workoutExerciseId);
    if (!workoutExercise) {
      throw new Error(`WorkoutExercise ${workoutExerciseId} not found`);
    }

    const setIndex = workoutExercise.sets.findIndex(s => s.id === setId);
    if (setIndex === -1) {
      throw new Error(`ExerciseSet ${setId} not found`);
    }

    workoutExercise.sets.splice(setIndex, 1);
    // Reorder remaining sets
    for (let i = 0; i < workoutExercise.sets.length; i++) {
      workoutExercise.sets[i].order = i;
    }

    await saveWorkout(workout);
    return workout;
  } catch (error) {
    console.error('deleteSet failed:', error);
    throw error;
  }
}

// ============================================================================
// Template-Workout Operations
// ============================================================================

/**
 * Create a workout from a template, materializing setGroups into ExerciseSets
 * @param {Template} template
 * @returns {Promise<Workout>}
 */
export async function startWorkoutFromTemplate(template) {
  try {
    // Create the workout in planning mode
    const workout = await createWorkout({
      name: template.name,
      templateId: template.id,
    });

    // For each template exercise, materialize the set groups into real sets
    for (let teIdx = 0; teIdx < template.templateExercises.length; teIdx++) {
      const templateExercise = template.templateExercises[teIdx];

      // Build the workout exercise
      const workoutExercise = {
        id: crypto.randomUUID(),
        order: teIdx,
        exerciseId: templateExercise.exerciseId,
        exerciseName: templateExercise.exerciseName,
        measureBy: null, // Will be filled in after exercise lookup
        sets: [],
      };

      // Fetch the exercise to get its measureBy
      const allExercises = await fetchExercises();
      const exercise = allExercises.find(e => e.id === templateExercise.exerciseId);
      if (exercise) {
        workoutExercise.measureBy = exercise.measureBy;
      }

      // Materialize set groups into individual sets
      let setOrderCounter = 0;
      for (const setGroup of templateExercise.setGroups) {
        for (let i = 0; i < setGroup.sets; i++) {
          const set = {
            id: crypto.randomUUID(),
            order: setOrderCounter++,
            weight: setGroup.weight,
            reps: setGroup.reps,
            duration: setGroup.duration,
            speed: null,
            incline: null,
            resistance: null,
            isCompleted: false,
          };
          workoutExercise.sets.push(set);
        }
      }

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
 * Convert a completed workout into a Template
 * Groups consecutive sets with identical reps/weight/duration into TemplateSetGroups
 * @param {Workout} workout
 * @param {string} name
 * @returns {Promise<Template>}
 */
export async function convertWorkoutToTemplate(workout, name) {
  try {
    // Get all templates to determine next order
    const existingTemplates = await fetchTemplates();
    const nextOrder = existingTemplates.length;

    // Convert each exercise
    const templateExercises = [];
    for (let exIdx = 0; exIdx < workout.exercises.length; exIdx++) {
      const workoutExercise = workout.exercises[exIdx];

      // Group sets with identical parameters
      const setGroups = [];
      let currentGroup = null;

      for (const set of workoutExercise.sets) {
        const groupKey = JSON.stringify({
          weight: set.weight,
          reps: set.reps,
          duration: set.duration,
        });

        if (currentGroup && currentGroup.key === groupKey) {
          currentGroup.count++;
        } else {
          if (currentGroup) {
            setGroups.push({
              id: crypto.randomUUID(),
              order: setGroups.length,
              sets: currentGroup.count,
              weight: currentGroup.set.weight,
              reps: currentGroup.set.reps,
              duration: currentGroup.set.duration,
            });
          }
          currentGroup = { key: groupKey, set, count: 1 };
        }
      }

      // Add the last group
      if (currentGroup) {
        setGroups.push({
          id: crypto.randomUUID(),
          order: setGroups.length,
          sets: currentGroup.count,
          weight: currentGroup.set.weight,
          reps: currentGroup.set.reps,
          duration: currentGroup.set.duration,
        });
      }

      templateExercises.push({
        id: crypto.randomUUID(),
        order: exIdx,
        exerciseId: workoutExercise.exerciseId,
        exerciseName: workoutExercise.exerciseName,
        setGroups,
      });
    }

    // Create the template
    return createTemplate({
      name,
      templateExercises,
      order: nextOrder,
      isCustom: true,
    });
  } catch (error) {
    console.error('convertWorkoutToTemplate failed:', error);
    throw error;
  }
}

/**
 * Update a template from a workout's current sets
 * (Used to sync back to source template after editing)
 * @param {Workout} workout
 * @returns {Promise<Template>}
 */
export async function updateTemplateFromWorkout(workout) {
  try {
    if (!workout.templateId) {
      throw new Error('Workout has no templateId');
    }

    // Fetch the template
    const allTemplates = await fetchTemplates();
    const template = allTemplates.find(t => t.id === workout.templateId);
    if (!template) {
      throw new Error(`Template ${workout.templateId} not found`);
    }

    // Group workout sets into template set groups
    const templateExercises = [];
    for (let exIdx = 0; exIdx < workout.exercises.length; exIdx++) {
      const workoutExercise = workout.exercises[exIdx];

      // Group sets with identical parameters
      const setGroups = [];
      let currentGroup = null;

      for (const set of workoutExercise.sets) {
        const groupKey = JSON.stringify({
          weight: set.weight,
          reps: set.reps,
          duration: set.duration,
        });

        if (currentGroup && currentGroup.key === groupKey) {
          currentGroup.count++;
        } else {
          if (currentGroup) {
            setGroups.push({
              id: crypto.randomUUID(),
              order: setGroups.length,
              sets: currentGroup.count,
              weight: currentGroup.set.weight,
              reps: currentGroup.set.reps,
              duration: currentGroup.set.duration,
            });
          }
          currentGroup = { key: groupKey, set, count: 1 };
        }
      }

      // Add the last group
      if (currentGroup) {
        setGroups.push({
          id: crypto.randomUUID(),
          order: setGroups.length,
          sets: currentGroup.count,
          weight: currentGroup.set.weight,
          reps: currentGroup.set.reps,
          duration: currentGroup.set.duration,
        });
      }

      templateExercises.push({
        id: crypto.randomUUID(),
        order: exIdx,
        exerciseId: workoutExercise.exerciseId,
        exerciseName: workoutExercise.exerciseName,
        setGroups,
      });
    }

    template.templateExercises = templateExercises;
    await updateTemplate(template);
    return template;
  } catch (error) {
    console.error('updateTemplateFromWorkout failed:', error);
    throw error;
  }
}

// ============================================================================
// Database Reset
// ============================================================================

/**
 * Reset database with optional backup
 * @param {{ backupExisting?: boolean }} options
 * @returns {Promise<void>}
 */
export async function resetDatabase({ backupExisting = true } = {}) {
  try {
    if (backupExisting) {
      // Fetch all data and write to localStorage
      const [exercises, templates, workouts] = await Promise.all([
        fetchExercises(),
        fetchTemplates(),
        fetchAllWorkouts(),
      ]);

      const backup = { exercises, templates, workouts };
      const backupKey = `pump-backup-${new Date().toISOString()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
      console.log(`[store] Database reset: backup written to ${backupKey}`);
    }

    // Delete the entire database
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase('pump');
      deleteRequest.onsuccess = () => {
        console.log('[store] Database deleted successfully');
        resolve();
      };
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  } catch (error) {
    console.error('resetDatabase failed:', error);
    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an empty ExerciseSet
 * @param {number} order
 * @returns {ExerciseSet}
 */
function createEmptySet(order) {
  return {
    id: crypto.randomUUID(),
    order,
    weight: null,
    reps: null,
    duration: null,
    speed: null,
    incline: null,
    resistance: null,
    isCompleted: false,
  };
}
