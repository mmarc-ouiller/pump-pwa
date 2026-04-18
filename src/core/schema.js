/**
 * IndexedDB Schema and Connection (Phase 0 — V2)
 * Handles database opening, creation, and schema migrations.
 */

export const DB_NAME = 'pump';
export const DB_VERSION = 2;

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
      const oldVersion = event.oldVersion;

      // Migration from V1 to V2: backup and reset
      if (oldVersion === 1 && oldVersion < DB_VERSION) {
        try {
          // Read all existing data before wiping
          const stores = ['workouts', 'exercises', 'templates'];
          const backup = {};
          let storesRead = 0;

          for (const storeName of stores) {
            if (db.objectStoreNames.contains(storeName)) {
              const tx = db.transaction(storeName, 'readonly');
              const store = tx.objectStore(storeName);
              const getAllRequest = store.getAll();

              getAllRequest.onsuccess = () => {
                backup[storeName] = getAllRequest.result;
                storesRead++;

                // Once all stores are read, write backup and clear stores
                if (storesRead === stores.length) {
                  const backupKey = `pump-backup-v1-${new Date().toISOString()}`;
                  localStorage.setItem(backupKey, JSON.stringify(backup));
                  console.log(`[schema] V1→V2 migration: backup written to localStorage under key: ${backupKey}`);

                  // Now clear the old stores
                  for (const storeName of stores) {
                    if (db.objectStoreNames.contains(storeName)) {
                      db.deleteObjectStore(storeName);
                    }
                  }
                }
              };

              getAllRequest.onerror = () => {
                console.error(`[schema] Failed to read ${storeName} for backup:`, getAllRequest.error);
              };
            }
          }
        } catch (error) {
          console.error('[schema] Migration error (continuing with store recreation):', error);
        }
      }

      // Ensure all stores exist with current schema (applies to both fresh and upgraded)
      if (!db.objectStoreNames.contains('workouts')) {
        const workoutsStore = db.createObjectStore('workouts', { keyPath: 'id' });
        workoutsStore.createIndex('startedAt', 'startedAt');
        workoutsStore.createIndex('completedAt', 'completedAt');
      }

      if (!db.objectStoreNames.contains('exercises')) {
        const exercisesStore = db.createObjectStore('exercises', { keyPath: 'id' });
        exercisesStore.createIndex('name', 'name');
        // Drop 'category' index if it exists (V1 only), create 'type' index (V2)
        // Note: can't delete during initial creation, but safe to just create 'type'
        exercisesStore.createIndex('type', 'type');
      }

      if (!db.objectStoreNames.contains('templates')) {
        const templatesStore = db.createObjectStore('templates', { keyPath: 'id' });
        templatesStore.createIndex('order', 'order');
      }
    };
  });
}
