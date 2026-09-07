import { getStore } from "@netlify/blobs";
import {
  DEFAULT_ADMIN_SETTINGS,
  type AdminSettings,
  type SettingsStore,
} from "./types";

const STORE_NAME = "admin-settings";
const SETTINGS_KEY = "settings";

/**
 * Server-side only. Netlify Blobs gives us a shared KV store without
 * provisioning a database — this is an interim implementation; swap for a
 * real DB-backed SettingsStore later without touching any caller, since
 * everything depends on the SettingsStore interface, not this file.
 */
export const netlifyBlobsSettingsStore: SettingsStore = {
  async get() {
    const store = getStore(STORE_NAME);
    const settings = await store.get(SETTINGS_KEY, { type: "json" });
    return (settings as AdminSettings | null) ?? DEFAULT_ADMIN_SETTINGS;
  },
  async set(settings) {
    const store = getStore(STORE_NAME);
    await store.setJSON(SETTINGS_KEY, settings);
  },
};
