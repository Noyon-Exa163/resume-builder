import type { StorageAdapter } from "@/lib/storage/types";
import { getThumbnailDb, THUMBNAIL_STORE_NAME } from "./db";

export interface ThumbnailRecord {
  /** Identifies the exact header content this thumbnail was rendered from —
   *  see lib/export/resumeThumbnail.ts's computeThumbnailKey(). A mismatch
   *  means the header changed since this was cached and it must be redrawn. */
  headerKey: string;
  /** A rendered PNG, as a data URL — cheap to hand straight to an <img>,
   *  no PDF re-parse needed on a cache hit. */
  dataUrl: string;
  updatedAt: string;
}

/**
 * One cached thumbnail per resume id + template id, overwritten in place
 * on every regeneration. Deleting a resume must also delete its rows
 * (see deleteResumeThumbnails in lib/export/resumeThumbnail.ts).
 */
export const thumbnailRepository: StorageAdapter<ThumbnailRecord> = {
  async get(id) {
    const db = await getThumbnailDb();
    return db.get(THUMBNAIL_STORE_NAME, id);
  },
  async list() {
    const db = await getThumbnailDb();
    return db.getAll(THUMBNAIL_STORE_NAME);
  },
  async set(id, value) {
    const db = await getThumbnailDb();
    await db.put(THUMBNAIL_STORE_NAME, value, id);
  },
  async delete(id) {
    const db = await getThumbnailDb();
    await db.delete(THUMBNAIL_STORE_NAME, id);
  },
};
