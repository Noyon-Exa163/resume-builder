import { z } from "zod";
import { isChatModelId } from "@/lib/ai/chatModels";
import type { AIProviderId } from "@/lib/ai/types";

export type { AIProviderId };

export interface AIProviderConfig {
  apiKey: string;
  /** May be blank — some providers (e.g. OpenRouter) can auto-select a model. */
  model?: string;
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
  /** Model the AI chat uses for resume imports and edits until a person
   *  picks another in the chat box. One of lib/ai/chatModels.ts's ids. */
  defaultChatModelId?: string;
  defaultTemplateId: string;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  providers: {},
  defaultTemplateId: "exabyting",
};

const AI_PROVIDER_IDS = [
  "gemini",
  "anthropic",
  "openrouter",
  "deepseek",
  "customOpenAICompatible",
] as const;

const AIProviderConfigSchema = z.object({
  apiKey: z.string().min(1),
  // Optional at this layer — not every provider needs one (OpenRouter can
  // auto-select), and requiring it here would be duplicating a rule the
  // provider adapters (lib/ai/providers/*) already enforce at call time.
  model: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

/**
 * Runtime guard for what gets written to the settings store — the
 * interfaces above are compile-time only. Every write path (the settings
 * API route today) should validate through this rather than trusting the
 * request body's shape.
 */
export const AdminSettingsInputSchema = z.object({
  // `z.record` with an enum key schema is exhaustive in Zod v4 — it would
  // require all 5 provider ids to be present. Admins only configure a
  // subset, so this needs `partialRecord` (every key optional) instead.
  providers: z.partialRecord(z.enum(AI_PROVIDER_IDS), AIProviderConfigSchema),
  defaultProviderId: z.enum(AI_PROVIDER_IDS).optional(),
  defaultChatModelId: z.string().refine(isChatModelId).optional(),
  defaultTemplateId: z.string().min(1),
});

/**
 * Depend on this, never on a concrete implementation (Netlify Blobs today,
 * a real database later) — see AGENTS.md §1.6.
 */
export interface SettingsStore {
  get(): Promise<AdminSettings>;
  set(settings: AdminSettings): Promise<void>;
}
