import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getProvider } from "@/lib/ai/registry";
import { RESUME_SCHEMA_DESCRIPTION } from "@/lib/ai/extractionPrompt";
import { postgresSettingsStore } from "@/lib/storage/settings/postgresStore";
import type { AIProviderId } from "@/lib/ai/types";

/**
 * POST /api/import/ai-parse — the only server hop in the import pipeline,
 * required because the AI provider/key is admin-managed. Any authenticated
 * user may call this; only admins can configure which provider it uses
 * (app/settings/ai). Always resolves the admin's configured default
 * provider — users never pick a provider themselves.
 */

const AiParseRequestSchema = z.object({
  rawText: z.string().min(1),
  customInstruction: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = AiParseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const settings = await postgresSettingsStore.get();
  const configuredIds = Object.keys(settings.providers) as AIProviderId[];
  // An admin can save a provider's key without separately picking it as the
  // default — that's an easy step to miss (and pointless busywork when only
  // one provider is configured), so fall back to the single configured one.
  const providerId =
    settings.defaultProviderId ??
    (configuredIds.length === 1 ? configuredIds[0] : undefined);
  const config = providerId ? settings.providers[providerId] : undefined;
  if (!providerId || !config) {
    return NextResponse.json(
      {
        error:
          configuredIds.length > 1
            ? "Multiple AI providers are configured but none is set as default. Ask an admin to pick one in AI Settings."
            : "No AI provider is configured. Ask an admin to set one up in AI Settings.",
      },
      { status: 422 },
    );
  }

  try {
    const provider = getProvider(providerId);
    const result = await provider.extractResumeData(
      {
        rawText: parsed.data.rawText,
        customInstruction: parsed.data.customInstruction,
        schemaDescription: RESUME_SCHEMA_DESCRIPTION,
      },
      config.apiKey,
      config.model ?? "",
      config.baseUrl,
    );
    return NextResponse.json({ json: result.json, raw: result.raw });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "AI extraction failed.",
      },
      { status: 502 },
    );
  }
}
