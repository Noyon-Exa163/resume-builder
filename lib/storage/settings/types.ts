import type { AIProviderId } from "@/lib/ai/types";

export type { AIProviderId };

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  /** Only set for customOpenAICompatible. */
  baseUrl?: string;
}

/**
 * Shared, admin-managed app settings — currently the only server-side state
 * in the whole app (AI keys must not live in the browser). Server-side only;
 * never imported from client components.
 */
export interface AdminSettings {
  providers: Partial<Record<AIProviderId, AIProviderConfig>>;
  defaultProviderId?: AIProviderId;
  defaultTemplateId: string;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  providers: {},
  defaultTemplateId: "exabyting",
};

/**
 * Depend on this, never on a concrete implementation (Netlify Blobs today,
 * a real database later) — see AGENTS.md §1.6.
 */
export interface SettingsStore {
  get(): Promise<AdminSettings>;
  set(settings: AdminSettings): Promise<void>;
}
