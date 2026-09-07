import { postgresSettingsStore } from "@/lib/storage/settings/postgresStore";
import type { AIProviderConfig } from "@/lib/storage/settings/types";
import { getProvider } from "./registry";
import type { AIProvider, AIProviderId } from "./types";

export interface ResolvedProvider {
  provider: AIProvider;
  config: AIProviderConfig;
}

export type ResolveProviderResult =
  | { ok: true; result: ResolvedProvider }
  | { ok: false; error: string };

/**
 * The one place that decides which AI provider a server route should use.
 * Shared by every route that needs "the admin's configured provider" (AI
 * import, AI refine, ...) so a fix here — like the single-configured-provider
 * fallback below — can't drift between them.
 *
 * An admin can save a provider's key without separately picking it as
 * "default" (easy to miss, and pointless busywork with only one provider
 * configured), so this falls back to the single configured provider when no
 * explicit default is set.
 */
export async function resolveConfiguredProvider(): Promise<ResolveProviderResult> {
  const settings = await postgresSettingsStore.get();
  const configuredIds = Object.keys(settings.providers) as AIProviderId[];
  const providerId =
    settings.defaultProviderId ??
    (configuredIds.length === 1 ? configuredIds[0] : undefined);
  const config = providerId ? settings.providers[providerId] : undefined;

  if (!providerId || !config) {
    return {
      ok: false,
      error:
        configuredIds.length > 1
          ? "Multiple AI providers are configured but none is set as default. Ask an admin to pick one in AI Settings."
          : "No AI provider is configured. Ask an admin to set one up in AI Settings.",
    };
  }

  return { ok: true, result: { provider: getProvider(providerId), config } };
}
