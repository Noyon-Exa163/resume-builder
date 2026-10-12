import type { AIMarkId } from "./providerMarks";
import type { AIProviderId } from "./types";

/**
 * The models a person can pick in the AI chat box. Only offered when the
 * admin's provider is OpenRouter (the one provider that can reach all of
 * them with a single key) — see chatModelIdsFor.
 *
 * Every entry was timed on a real 3-page resume import and finished in well
 * under the hosting platform's 60-second limit. Models that "think" for
 * 30+ seconds regardless of settings (several were tested) are left out on
 * purpose: they get cut off mid-import. Re-time a model before adding it.
 */
/**
 * What a typical resume import uses on one model — measured by importing a
 * real 3-page resume (October 2026, averaged over repeat runs). Token counts
 * differ per model for the same text because each maker counts tokens its
 * own way. lib/ai/chatModelPricing.ts multiplies these by OpenRouter's live
 * prices; only the prices move, so nothing here needs upkeep when they do.
 */
export interface ImportCostProfile {
  inputTokens: number;
  outputTokens: number;
  /** OpenAI models bill a first-time prompt at the dearer cache-write rate. */
  billsCacheWrite: boolean;
  /** What that import was actually billed — used if live prices can't be read. */
  fallbackCostUsd: number;
}

export interface ChatModelOption {
  /** OpenRouter model id. */
  id: string;
  name: string;
  importProfile: ImportCostProfile;
  /** One short line shown under the name. */
  detail: string;
  /** Which brand mark to show (see providerMarks.ts) — the model's maker,
   *  not the provider the request is sent through. */
  markId: AIMarkId;
}

export const CHAT_MODEL_OPTIONS: readonly ChatModelOption[] = [
  {
    id: "anthropic/claude-haiku-5.5",
    name: "Claude Haiku 5.5",
    importProfile: {
      inputTokens: 5838,
      outputTokens: 4788,
      billsCacheWrite: false,
      fallbackCostUsd: 0.003,
    },
    detail: "Fast and low cost",
    markId: "anthropic",
  },
  {
    id: "openai/gpt-6-luna",
    name: "GPT-6 Luna",
    importProfile: {
      inputTokens: 3471,
      outputTokens: 2689,
      billsCacheWrite: true,
      fallbackCostUsd: 0.0018,
    },
    detail: "Cheapest",
    markId: "customOpenAICompatible",
  },
  {
    id: "openai/gpt-6-sol",
    name: "GPT-6 Sol",
    importProfile: {
      inputTokens: 3471,
      outputTokens: 2610,
      billsCacheWrite: true,
      fallbackCostUsd: 0.0348,
    },
    detail: "More capable — best value",
    markId: "customOpenAICompatible",
  },
  {
    id: "anthropic/claude-sonnet-5.5",
    name: "Claude Sonnet 5.5",
    importProfile: {
      inputTokens: 5839,
      outputTokens: 4801,
      billsCacheWrite: false,
      fallbackCostUsd: 0.0597,
    },
    detail: "More capable — slower, highest cost",
    markId: "anthropic",
  },
  {
    id: "z-ai/glm-5.3-prime",
    name: "GLM-5.3 Prime",
    importProfile: {
      inputTokens: 3497,
      outputTokens: 2930,
      billsCacheWrite: false,
      fallbackCostUsd: 0.0354,
    },
    detail: "More capable — moderate speed",
    markId: "zai",
  },
];

/** Used until an admin picks a default in AI Settings. */
export const DEFAULT_CHAT_MODEL_ID = CHAT_MODEL_OPTIONS[0].id;

/** The admin's saved default if it is still on the list, else the built-in one. */
export function resolveDefaultChatModelId(saved: unknown): string {
  return isChatModelId(saved) ? saved : DEFAULT_CHAT_MODEL_ID;
}

/**
 * The line shown under a model's name: estimated cost per resume import
 * (two significant digits — "$0.003", "$0.0018") when known, then its detail.
 */
export function describeChatModel(
  option: ChatModelOption,
  estimatedCostUsd?: number,
): string {
  if (estimatedCostUsd === undefined) return option.detail;
  return `~$${Number(estimatedCostUsd.toPrecision(2))}/Resume • ${option.detail}`;
}

export function isChatModelId(value: unknown): value is string {
  return CHAT_MODEL_OPTIONS.some((option) => option.id === value);
}

/** The model ids a person may choose from under the given provider. */
export function chatModelIdsFor(providerId: AIProviderId): string[] {
  return providerId === "openrouter"
    ? CHAT_MODEL_OPTIONS.map((option) => option.id)
    : [];
}
