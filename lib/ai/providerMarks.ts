import type { AIProviderId } from "./types";

/** Brand marks in `public/assets/ai/`. Paths are URL paths, not imports. */
export const PROVIDER_MARK_SRC: Record<AIProviderId, string> = {
  openrouter: "/assets/ai/openrouter_light.svg",
  gemini: "/assets/ai/gemini.svg",
  anthropic: "/assets/ai/claude-ai-icon.svg",
  deepseek: "/assets/ai/deepseek.svg",
  customOpenAICompatible: "/assets/ai/openai.svg",
};

/** Black/default-fill marks that need invert in dark mode. */
export const PROVIDER_MARK_INK: ReadonlySet<AIProviderId> = new Set([
  "openrouter",
  "customOpenAICompatible",
]);
