import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "exabyting-resume-pending-import";
const DB_VERSION = 1;
const PENDING_IMPORT_STORE = "pendingImport";

let dbPromise: Promise<IDBPDatabase> | undefined;

/**
 * A dedicated IndexedDB database for handing a file (and optional prompt)
 * picked in the New Resume dialog across the navigation into that resume's
 * editor — IndexedDB is the only client-side store that can hold a real
 * File object, unlike the URL or a server round trip.
 */
export function getPendingImportDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PENDING_IMPORT_STORE)) {
          db.createObjectStore(PENDING_IMPORT_STORE);
        }
      },
    });
  }
  return dbPromise;
}

export const PENDING_IMPORT_STORE_NAME = PENDING_IMPORT_STORE;
