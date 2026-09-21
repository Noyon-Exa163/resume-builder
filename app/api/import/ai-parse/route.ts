import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  AI_PARSE_RULE,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/rateLimit";
import {
  AI_ATTACHED_TEXT_MAX_CHARS,
  AI_INSTRUCTION_MAX_CHARS,
} from "@/lib/ai/limits";
import { resolveConfiguredProvider } from "@/lib/ai/resolveConfiguredProvider";
import { RESUME_SCHEMA_DESCRIPTION } from "@/lib/ai/extractionPrompt";

/**
 * POST /api/import/ai-parse — the only server hop in the import pipeline,
 * required because the AI provider/key is admin-managed. Any authenticated
 * user may call this; only admins can configure which provider it uses
 * (app/settings/ai). Always resolves the admin's configured default
 * provider — users never pick a provider themselves.
 */

const AiParseRequestSchema = z.object({
  rawText: z.string().min(1).max(AI_ATTACHED_TEXT_MAX_CHARS),
  customInstruction: z.string().max(AI_INSTRUCTION_MAX_CHARS).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await checkRateLimit(user.id, AI_PARSE_RULE);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

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

  const resolved = await resolveConfiguredProvider();
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 422 });
  }
  const { provider, config } = resolved.result;

  try {
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
