import { openDB, type IDBPDatabase } from "idb";
import type { ResumeData } from "@/lib/schema/resume";

const DB_NAME = "exabyting-resume-builder";
const DB_VERSION = 1;
const RESUMES_STORE = "resumes";

interface ResumeBuilderDB {
  [RESUMES_STORE]: ResumeData;
}

let dbPromise: Promise<IDBPDatabase> | undefined;

export function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(RESUMES_STORE)) {
          db.createObjectStore(RESUMES_STORE, { keyPath: "meta.id" });
        }
      },
    });
  }
  return dbPromise;
}

export const RESUME_STORE_NAME = RESUMES_STORE;
export type { ResumeBuilderDB };
