import type { AIProvider, AIProviderId } from "./types";
import { anthropicProvider } from "./providers/anthropic";
import { customOpenAICompatibleProvider } from "./providers/customOpenAICompatible";
import { deepseekProvider } from "./providers/deepseek";
import { geminiProvider } from "./providers/gemini";
import { openrouterProvider } from "./providers/openrouter";

/**
 * Provider registry. Adding a vendor = new file under providers/ + one entry
 * here. Callers depend on `AIProvider`, never on a concrete adapter.
 */
export const providerRegistry: Record<AIProviderId, AIProvider> = {
  gemini: geminiProvider,
  anthropic: anthropicProvider,
  openrouter: openrouterProvider,
  deepseek: deepseekProvider,
  customOpenAICompatible: customOpenAICompatibleProvider,
};

export function getProvider(id: AIProviderId): AIProvider {
  const provider = providerRegistry[id];
  if (!provider) {
    throw new Error(`No AI provider registered for "${id}".`);
  }
  return provider;
}
