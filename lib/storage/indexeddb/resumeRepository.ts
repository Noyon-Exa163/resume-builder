import type { ResumeData } from "@/lib/schema/resume";
import type { StorageAdapter } from "@/lib/storage/types";
import { getDb, RESUME_STORE_NAME } from "./db";

/**
 * Client-side resume storage (IndexedDB). This is the only place resumes
 * live today — there is no server-side resume storage until real accounts
 * ship. See AGENTS.md for why UI code must go through this instead of
 * touching IndexedDB directly.
 */
export const resumeRepository: StorageAdapter<ResumeData> = {
  async get(id) {
    const db = await getDb();
    return db.get(RESUME_STORE_NAME, id);
  },
  async list() {
    const db = await getDb();
    return db.getAll(RESUME_STORE_NAME);
  },
  async set(id, value) {
    const db = await getDb();
    await db.put(RESUME_STORE_NAME, value);
  },
  async delete(id) {
    const db = await getDb();
    await db.delete(RESUME_STORE_NAME, id);
  },
};
