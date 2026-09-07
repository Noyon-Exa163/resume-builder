import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getProvider } from "@/lib/ai/registry";
import type { AIProviderId } from "@/lib/ai/types";

/**
 * POST /api/settings/test-connection — admin-only. Tests whatever
 * apiKey/model/baseUrl is currently typed into the AI Settings form (not
 * necessarily what's persisted yet), so an admin can validate before saving.
 * The vendor round-trip stays server-side — never send a raw API key test
 * through the browser to a third party.
 */

const TestConnectionRequestSchema = z.object({
  providerId: z.enum([
    "gemini",
    "anthropic",
    "openrouter",
    "deepseek",
    "customOpenAICompatible",
  ]),
  apiKey: z.string().min(1),
  // Optional — some providers (e.g. OpenRouter) can auto-select a model; the
  // provider adapter itself throws a clear error if it actually needs one.
  model: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
    );
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

  const parsed = TestConnectionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { providerId, apiKey, model, baseUrl } = parsed.data;
  const provider = getProvider(providerId as AIProviderId);
  const result = await provider.testConnection(apiKey, model ?? "", baseUrl);
  return NextResponse.json(result);
}
