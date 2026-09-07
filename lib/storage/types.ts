/**
 * Generic storage contract. Depend on this, never on a concrete
 * implementation (IndexedDB today, a real database later) — see AGENTS.md §1.6.
 */
export interface StorageAdapter<T> {
  get(id: string): Promise<T | undefined>;
  list(): Promise<T[]>;
  set(id: string, value: T): Promise<void>;
  delete(id: string): Promise<void>;
}
