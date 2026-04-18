/**
 * Pump Data Models
 * JSDoc type definitions only. No runtime code.
 * These typedefs mirror the Swift models from WorkoutApp.
 */

/**
 * @typedef {'push'|'pull'|'legs'|'core'|'cardio'} ExerciseCategory
 */

/**
 * @typedef {'strength'|'cardio'} ExerciseType
 */

/**
 * An exercise definition (e.g., "Bench Press", "Treadmill")
 * @typedef {Object} Exercise
 * @property {string} id - Unique identifier
 * @property {string} name - Exercise name
 * @property {ExerciseCategory} category - Exercise category
 * @property {ExerciseType} type - Exercise type
 * @property {boolean} isCustom - Whether this is a user-created exercise
 */

/**
 * A single set within a workout exercise
 * @typedef {Object} ExerciseSet
 * @property {string} id - Unique identifier
 * @property {number|null} weight - Weight in pounds (strength exercises)
 * @property {number|null} reps - Repetitions (strength exercises)
 * @property {number|null} duration - Duration in seconds (cardio exercises)
 * @property {number|null} speed - Speed in mph (cardio exercises)
 * @property {number|null} incline - Incline in percent (cardio exercises)
 * @property {number|null} resistance - Resistance level (cardio exercises)
 * @property {boolean} isCompleted - Whether this set was completed
 */

/**
 * An exercise instance within a workout, containing sets
 * @typedef {Object} WorkoutExercise
 * @property {string} id - Unique identifier
 * @property {string} exerciseId - Reference to Exercise.id
 * @property {string} exerciseName - Cached exercise name
 * @property {ExerciseType} exerciseType - Cached exercise type
 * @property {ExerciseSet[]} sets - Array of sets for this exercise
 */

/**
 * A complete workout session
 * @typedef {Object} Workout
 * @property {string} id - Unique identifier
 * @property {string} name - Workout name
 * @property {string|null} templateId - Reference to Template.id if created from template
 * @property {string} startedAt - ISO 8601 timestamp when workout started
 * @property {string|null} completedAt - ISO 8601 timestamp when workout completed (null if active)
 * @property {WorkoutExercise[]} exercises - Array of exercises in this workout
 */

/**
 * A workout template with suggested exercises
 * @typedef {Object} Template
 * @property {string} id - Unique identifier
 * @property {string} name - Template name
 * @property {number} order - Display order
 * @property {string[]} exerciseNames - Array of exercise names for this template
 */
