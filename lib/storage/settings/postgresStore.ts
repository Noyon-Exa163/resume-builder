import { sql } from "@/lib/db/client";
import { DEFAULT_ADMIN_SETTINGS, type AdminSettings, type SettingsStore } from "./types";

const SETTINGS_ROW_ID = "default";

interface AdminSettingsRow {
  data: AdminSettings;
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
    const rows = (await sql`
      SELECT data FROM admin_settings WHERE id = ${SETTINGS_ROW_ID}
    `) as AdminSettingsRow[];
    return rows[0]?.data ?? DEFAULT_ADMIN_SETTINGS;
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
  },
};
