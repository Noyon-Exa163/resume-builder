/**
 * Tiny stale-while-revalidate cache for page-level client fetches. Routes
 * like /users and /settings/ai load their data in a client effect on every
 * visit — over a remote database that makes every page switch wait on the
 * same API call again. Page components read the cached payload synchronously
 * at first render (no skeleton flash on back-and-forth navigation *or*
 * reload) and refresh from the API in the background; mutations overwrite
 * the entry through their normal refetch, so nothing is served stale after
 * a write.
 *
 * Two layers:
 * - an in-memory Map for the live SPA session (fast, dies on reload);
 * - sessionStorage so a repeat visit SURVIVES a full page reload. Cleared on
 *   logout and on sign-in (see clearPageDataCache) so one user's data is
 *   never shown to the next person on a shared machine. Never persisted to
 *   localStorage — that would leak admin data across sessions.
 */

const STORAGE_KEY = "exaresume-page-data-cache";

interface CacheEntry {
  data: unknown;
  at: number;
}

/** L1 — the live SPA session. */
const entries = new Map<string, CacheEntry>();

function loadStore(): Record<string, CacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, CacheEntry>): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable (private mode, quota) — caching silently
    // degrades to the in-memory layer.
  }
}

/** The cached payload for `key`, or null when absent or older than maxAgeMs. */
export function readCachedPageData<T>(key: string, maxAgeMs: number): T | null {
  const mem = entries.get(key);
  if (mem && Date.now() - mem.at <= maxAgeMs) return mem.data as T;

  const persisted = loadStore()[key];
  if (persisted && Date.now() - persisted.at <= maxAgeMs) {
    entries.set(key, persisted); // promote to the live session
    return persisted.data as T;
  }
  return null;
}

/** Stores a freshly fetched payload under `key` (both layers). */
export function cachePageData<T>(key: string, data: T): void {
  const entry: CacheEntry = { data, at: Date.now() };
  entries.set(key, entry);
  const store = loadStore();
  store[key] = entry;
  saveStore(store);
}

/**
 * Drops every cached payload — memory and sessionStorage. Call it on logout
 * and on successful sign-in so one user's cached data never surfaces for
 * the next person on the same tab.
 */
export function clearPageDataCache(): void {
  entries.clear();
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}
