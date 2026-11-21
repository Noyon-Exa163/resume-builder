/**
 * Tiny stale-while-revalidate cache for page-level client fetches. Routes
 * like /users and /settings/ai load their data in a client effect on every
 * visit — over a remote database that makes every page switch wait on the
 * same API call again. Page components read the cached payload synchronously
 * at first render (no skeleton flash on back-and-forth navigation) and
 * refresh from the API in the background; mutations overwrite the entry
 * through their normal refetch, so nothing is served stale after a write.
 *
 * Intentionally NOT persisted: sessionStorage/localStorage would leak admin
 * data across shared-machine sessions and survive sign-out.
 */

const entries = new Map<string, { data: unknown; at: number }>();

/** The cached payload for `key`, or null when absent or older than maxAgeMs. */
export function readCachedPageData<T>(key: string, maxAgeMs: number): T | null {
  const entry = entries.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > maxAgeMs) return null;
  return entry.data as T;
}

/** Stores a freshly fetched payload under `key`. */
export function cachePageData<T>(key: string, data: T): void {
  entries.set(key, { data, at: Date.now() });
}
