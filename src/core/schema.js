/**
 * IndexedDB Schema and Connection
 * Phase 0: Foundation only. Phase 1A.1 will implement migrations.
 */

export const DB_NAME = 'pump';
export const DB_VERSION = 1;

/**
 * Open (or create) the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Workouts store
      if (!db.objectStoreNames.contains('workouts')) {
        const workoutsStore = db.createObjectStore('workouts', { keyPath: 'id' });
        workoutsStore.createIndex('startedAt', 'startedAt');
        workoutsStore.createIndex('completedAt', 'completedAt');
      }

      // Exercises store
      if (!db.objectStoreNames.contains('exercises')) {
        const exercisesStore = db.createObjectStore('exercises', { keyPath: 'id' });
        exercisesStore.createIndex('name', 'name');
        exercisesStore.createIndex('category', 'category');
      }

      // Templates store
      if (!db.objectStoreNames.contains('templates')) {
        const templatesStore = db.createObjectStore('templates', { keyPath: 'id' });
        templatesStore.createIndex('order', 'order');
      }
    };
  });
}
