import { CHAT_MODEL_OPTIONS, type ChatModelOption } from "./chatModels";

/**
 * Estimated cost of one resume import per chat-box model, priced from
 * OpenRouter's public model list so the figures follow its pricing without
 * anyone editing them. Server-only (called from the ai-chat route).
 */

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
/** The estimate only decorates the picker — never hold the page up for it. */
const PRICING_FETCH_TIMEOUT_MS = 4_000;
/** Prices change rarely; re-read a few times a day per server instance. */
const PRICING_TTL_MS = 6 * 60 * 60 * 1000;

interface OpenRouterPricing {
  prompt?: string;
  completion?: string;
  input_cache_write?: string;
}

type PricingById = Map<string, OpenRouterPricing>;

let cached: { at: number; pricing: PricingById } | undefined;

async function loadPricing(): Promise<PricingById | undefined> {
  if (cached && Date.now() - cached.at < PRICING_TTL_MS) return cached.pricing;
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      signal: AbortSignal.timeout(PRICING_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return cached?.pricing;
    const body = (await response.json()) as {
      data?: Array<{ id?: string; pricing?: OpenRouterPricing }>;
    };
    const pricing: PricingById = new Map();
    for (const model of body.data ?? []) {
      if (model.id && model.pricing) pricing.set(model.id, model.pricing);
    }
    cached = { at: Date.now(), pricing };
    return pricing;
  } catch {
    // Stale prices beat none; with neither, callers use the fallback figure.
    return cached?.pricing;
  }
}

/** Per-token USD price as a number, or undefined if missing or not a price. */
function toPrice(value: string | undefined): number | undefined {
  const price = Number(value);
  return value !== undefined && Number.isFinite(price) && price > 0
    ? price
    : undefined;
}

export function estimateImportCostUsd(
  option: ChatModelOption,
  pricing: OpenRouterPricing | undefined,
): number {
  const { importProfile: profile } = option;
  const outputPrice = toPrice(pricing?.completion);
  const inputPrice =
    (profile.billsCacheWrite && toPrice(pricing?.input_cache_write)) ||
    toPrice(pricing?.prompt);
  if (!inputPrice || !outputPrice) return profile.fallbackCostUsd;
  return profile.inputTokens * inputPrice + profile.outputTokens * outputPrice;
}

export interface ChatModelEstimate {
  id: string;
  estimatedCostUsd: number;
}

export async function estimateChatModelCosts(
  modelIds: string[],
): Promise<ChatModelEstimate[]> {
  if (modelIds.length === 0) return [];
  const pricing = await loadPricing();
  return CHAT_MODEL_OPTIONS.filter((option) =>
    modelIds.includes(option.id),
  ).map((option) => ({
    id: option.id,
    estimatedCostUsd: estimateImportCostUsd(option, pricing?.get(option.id)),
  }));
}
