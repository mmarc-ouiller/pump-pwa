/**
 * Pump Data Models (Phase 0 — V2)
 * JSDoc type definitions only. No runtime code.
 * These typedefs are the canonical data shapes for the PWA.
 */

/**
 * Body part classification for exercises
 * @typedef {'chest'|'back'|'shoulders'|'biceps'|'triceps'|'legs'|'core'|'cardio'} BodyPart
 */

/**
 * How a set is measured
 * @typedef {'weight'|'seconds'|'repsOnly'} MeasureBy
 */

/**
 * An exercise definition (e.g., "Bench Press", "Treadmill")
 * @typedef {Object} Exercise
 * @property {string} id - Unique identifier (UUID)
 * @property {string} name - Exercise name
 * @property {BodyPart} type - Body-part classification (chest, back, shoulders, etc.)
 * @property {MeasureBy} measureBy - How sets are measured (weight, seconds, repsOnly)
 * @property {boolean} isCustom - Whether this is a user-created exercise
 */

/**
 * A single set within a workout exercise
 * @typedef {Object} ExerciseSet
 * @property {string} id - Unique identifier (UUID)
 * @property {number} order - 0-based position within the exercise's sets
 * @property {number|null} weight - Weight in pounds (for measureBy='weight')
 * @property {number|null} reps - Repetitions (for measureBy='weight' or 'repsOnly')
 * @property {number|null} duration - Duration in seconds (for measureBy='seconds' or cardio)
 * @property {number|null} speed - Speed in mph (for cardio exercises)
 * @property {number|null} incline - Incline in percent (for cardio exercises)
 * @property {number|null} resistance - Resistance level (for cardio exercises)
 * @property {boolean} isCompleted - Whether this set was completed
 */

/**
 * An exercise instance within a workout, containing sets
 * @typedef {Object} WorkoutExercise
 * @property {string} id - Unique identifier (UUID)
 * @property {number} order - 0-based position within the workout's exercises
 * @property {string} exerciseId - Reference to Exercise.id
 * @property {string} exerciseName - Cached exercise name for display
 * @property {MeasureBy} measureBy - How sets are measured (replaces old exerciseType)
 * @property {ExerciseSet[]} sets - Array of sets for this exercise
 */

/**
 * A complete workout session
 * @typedef {Object} Workout
 * @property {string} id - Unique identifier (UUID)
 * @property {string} name - Workout name
 * @property {string|null} templateId - Reference to Template.id if created from a template
 * @property {string} createdAt - ISO 8601 timestamp when workout record was created
 * @property {string|null} startedAt - ISO 8601 timestamp when user pressed START (null = planning mode)
 * @property {string|null} completedAt - ISO 8601 timestamp when workout finished (null = not finished)
 * @property {string|null} pausedAt - ISO 8601 timestamp when pause began (null = not paused)
 * @property {number} totalPausedDuration - Accumulated paused seconds
 * @property {boolean} hasBeenEdited - True if user modified the workout while in planning mode
 * @property {WorkoutExercise[]} exercises - Array of exercises in this workout
 *
 * Derived states (not stored, computed):
 * - isPlanning = (startedAt === null)
 * - isActive = (startedAt !== null && completedAt === null && pausedAt === null)
 * - isPaused = (pausedAt !== null)
 * - isPromoted = (startedAt !== null || hasBeenEdited)
 */

/**
 * A grouping of sets with identical parameters in a template
 * Represents "3 sets × 8 reps @ 155 lb" or "3 sets × 45 seconds" as one entity
 * @typedef {Object} TemplateSetGroup
 * @property {string} id - Unique identifier (UUID)
 * @property {number} order - 0-based position within the exercise's set groups
 * @property {number} sets - Count of sets in this group
 * @property {number|null} reps - Reps per set (for strength exercises)
 * @property {number|null} weight - Weight in pounds per set (for strength with weight)
 * @property {number|null} duration - Duration in seconds per set (for timed exercises)
 */

/**
 * An exercise instance within a template, containing set groups
 * @typedef {Object} TemplateExercise
 * @property {string} id - Unique identifier (UUID)
 * @property {number} order - 0-based position within template's exercises
 * @property {string} exerciseId - Reference to Exercise.id
 * @property {string} exerciseName - Cached exercise name
 * @property {TemplateSetGroup[]} setGroups - Grouped sets with pre-filled parameters
 */

/**
 * A workout template with suggested exercises and set parameters
 * @typedef {Object} Template
 * @property {string} id - Unique identifier (UUID)
 * @property {string} name - Template name
 * @property {number} order - Display order (0, 1, 2, ...)
 * @property {boolean} isCustom - Whether this is a user-created template
 * @property {TemplateExercise[]} templateExercises - Exercises with their set groups
 */
