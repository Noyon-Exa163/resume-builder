import {
  CHAT_MODEL_OPTIONS,
  isChatModelId,
  type ChatModelEstimate,
  type ChatModelOption,
} from "./chatModels";
import { fetchWithTimeout } from "./http";

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
/** After a failed read, serve fallbacks for a while instead of retrying. */
const PRICING_RETRY_MS = 60 * 1000;

interface OpenRouterPricing {
  prompt?: string;
  completion?: string;
  input_cache_write?: string;
}

type PricingById = Map<string, OpenRouterPricing>;

/** Holds the request itself, so concurrent callers share one download. */
let cached: { expiresAt: number; pricing: Promise<PricingById> } | undefined;

/** Pricing for the catalog's models only — the full list is ~450 models. */
async function fetchPricing(): Promise<PricingById> {
  const response = await fetchWithTimeout(
    OPENROUTER_MODELS_URL,
    {},
    PRICING_FETCH_TIMEOUT_MS,
  );
  if (!response.ok) throw new Error(`OpenRouter pricing: ${response.status}`);
  const body = (await response.json()) as {
    data?: Array<{ id?: string; pricing?: OpenRouterPricing }>;
  };
  const pricing: PricingById = new Map();
  for (const model of body.data ?? []) {
    if (!model.id || !model.pricing || !isChatModelId(model.id)) continue;
    const { prompt, completion, input_cache_write } = model.pricing;
    pricing.set(model.id, { prompt, completion, input_cache_write });
  }
  return pricing;
}

function loadPricing(): Promise<PricingById> {
  if (cached && Date.now() < cached.expiresAt) return cached.pricing;
  const entry = {
    expiresAt: Date.now() + PRICING_TTL_MS,
    // No prices means every model shows its fallback figure.
    pricing: fetchPricing().catch((): PricingById => {
      entry.expiresAt = Date.now() + PRICING_RETRY_MS;
      return new Map();
    }),
  };
  cached = entry;
  return entry.pricing;
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

/** Every chat-box model with its estimated cost per resume import. */
export async function estimateChatModelCosts(): Promise<ChatModelEstimate[]> {
  const pricing = await loadPricing();
  return CHAT_MODEL_OPTIONS.map((option) => ({
    id: option.id,
    estimatedCostUsd: estimateImportCostUsd(option, pricing.get(option.id)),
  }));
}
