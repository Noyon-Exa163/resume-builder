import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "exabyting-resume-thumbnails";
const DB_VERSION = 1;
const THUMBNAILS_STORE = "thumbnails";

let dbPromise: Promise<IDBPDatabase> | undefined;

/**
 * A dedicated IndexedDB database, separate from any resume data store —
 * this cache holds one derived, disposable record per resume (see
 * thumbnailRepository.ts) and has no bearing on the source of truth.
 */
export function getThumbnailDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(THUMBNAILS_STORE)) {
          db.createObjectStore(THUMBNAILS_STORE);
        }
      },
    });
  }
  return dbPromise;
}

export const THUMBNAIL_STORE_NAME = THUMBNAILS_STORE;
