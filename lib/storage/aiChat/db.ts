import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "exabyting-resume-ai-chat";
const DB_VERSION = 1;
const AI_CHAT_STORE = "aiChatHistory";

let dbPromise: Promise<IDBPDatabase> | undefined;

/**
 * A dedicated IndexedDB database, separate from any resume data store —
 * this cache holds one derived, disposable record per resume (see
 * aiChatRepository.ts) and has no bearing on the source of truth.
 */
export function getAiChatDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(AI_CHAT_STORE)) {
          db.createObjectStore(AI_CHAT_STORE);
        }
      },
    });
  }
  return dbPromise;
}

export const AI_CHAT_STORE_NAME = AI_CHAT_STORE;
