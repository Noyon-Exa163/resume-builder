import { sql } from "@/lib/db/client";
import { DEFAULT_ADMIN_SETTINGS, type AdminSettings, type SettingsStore } from "./types";

const SETTINGS_ROW_ID = "default";

interface AdminSettingsRow {
  data: AdminSettings;
}

/**
 * Short-lived instance-level cache for the settings read — AI settings sit
 * in the remote database, and they're read on EVERY chat message and AI
 * request. Admin settings change rarely, so 60 seconds of staleness trades
 * nothing for a round trip saved on each of those calls. In-memory only:
 * API keys must never be written to a shared/persistent cache.
 */
const SETTINGS_CACHE_TTL_MS = 60 * 1000;
let cachedSettings: { data: AdminSettings; at: number } | null = null;

function invalidateSettingsCache(): void {
  cachedSettings = null;
}

/**
 * Postgres-backed settings store (db/migrations/0002_settings.sql) —
 * consistent with the rest of the app's persistence (users, resumes already
 * live in the same Neon database) and, unlike the Netlify Blobs store this
 * replaced, works under plain `next dev` rather than requiring `netlify dev`
 * or manual siteID/token config for local testing. Callers depend only on
 * `SettingsStore` (AGENTS.md §1.6), so this swap didn't touch any of them.
 */
export const postgresSettingsStore: SettingsStore = {
  async get() {
    if (cachedSettings && Date.now() - cachedSettings.at <= SETTINGS_CACHE_TTL_MS) {
      return cachedSettings.data;
    }
    const rows = (await sql`
      SELECT data FROM admin_settings WHERE id = ${SETTINGS_ROW_ID}
    `) as AdminSettingsRow[];
    const data = rows[0]?.data ?? DEFAULT_ADMIN_SETTINGS;
    cachedSettings = { data, at: Date.now() };
    return data;
  },
  async set(settings) {
    // Bind the object itself — postgres.js serializes it to JSON for the
    // ::jsonb cast. Pre-stringifying would store a double-encoded string
    // scalar (see db/migrations/0011).
    await sql`
      INSERT INTO admin_settings (id, data, updated_at)
      VALUES (${SETTINGS_ROW_ID}, ${settings}::jsonb, now())
      ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data, updated_at = now()
    `;
    invalidateSettingsCache();
  },
};
