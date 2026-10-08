import type { StorageAdapter } from "@/lib/storage/types";
import { getPendingImportDb, PENDING_IMPORT_STORE_NAME } from "./db";

export interface PendingImportRecord {
  file?: File;
  prompt?: string;
}

/**
 * Carries the file/prompt picked in the New Resume dialog across the
 * navigation into that resume's freshly created editor, where AiChatPanel
 * consumes and clears it on mount. One record per resume id, consumed
 * exactly once — there is no eviction because `delete` always follows
 * `get` in the one place this is read (see AiChatPanel's pending-import
 * effect).
 */
export const pendingImportRepository: StorageAdapter<PendingImportRecord> = {
  async get(id) {
    const db = await getPendingImportDb();
    return db.get(PENDING_IMPORT_STORE_NAME, id);
  },
  async list() {
    const db = await getPendingImportDb();
    return db.getAll(PENDING_IMPORT_STORE_NAME);
  },
  async set(id, value) {
    const db = await getPendingImportDb();
    await db.put(PENDING_IMPORT_STORE_NAME, value, id);
  },
  async delete(id) {
    const db = await getPendingImportDb();
    await db.delete(PENDING_IMPORT_STORE_NAME, id);
  },
};
