import type { StorageAdapter } from "@/lib/storage/types";
import type { ChatMessage } from "@/lib/ai/chatTypes";
import { getAiChatDb, AI_CHAT_STORE_NAME } from "./db";

export interface AiChatRecord {
  messages: ChatMessage[];
  updatedAt: string;
}

/**
 * One chat transcript per resume id, overwritten in place on every send,
 * edit, or regenerate — there is never more than one record per resume, so
 * nothing here needs eviction or garbage collection. Deleting a resume must
 * also delete its row (see DashboardClient's confirmDelete).
 */
export const aiChatRepository: StorageAdapter<AiChatRecord> = {
  async get(id) {
    const db = await getAiChatDb();
    return db.get(AI_CHAT_STORE_NAME, id);
  },
  async list() {
    const db = await getAiChatDb();
    return db.getAll(AI_CHAT_STORE_NAME);
  },
  async set(id, value) {
    const db = await getAiChatDb();
    await db.put(AI_CHAT_STORE_NAME, value, id);
  },
  async delete(id) {
    const db = await getAiChatDb();
    await db.delete(AI_CHAT_STORE_NAME, id);
  },
};
