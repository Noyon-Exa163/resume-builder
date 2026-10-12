import type { AIProviderId } from "./types";

/**
 * Anything with a brand mark: every provider, plus model makers that are
 * only reachable through one (see lib/ai/chatModels.ts).
 */
export type AIMarkId = AIProviderId | "zai";

/** Brand marks in `public/assets/ai/`. Paths are URL paths, not imports. */
export const PROVIDER_MARK_SRC: Record<AIMarkId, string> = {
  openrouter: "/assets/ai/openrouter_light.svg",
  gemini: "/assets/ai/gemini.svg",
  anthropic: "/assets/ai/claude-ai-icon.svg",
  deepseek: "/assets/ai/deepseek.svg",
  customOpenAICompatible: "/assets/ai/openai.svg",
  zai: "/assets/ai/zai.svg",
};

/** Black/default-fill marks that need invert in dark mode. */
export const PROVIDER_MARK_INK: ReadonlySet<AIMarkId> = new Set<AIMarkId>([
  "openrouter",
  "customOpenAICompatible",
  "zai",
]);
