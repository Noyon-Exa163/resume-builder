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
  // 401 for no session at all, 403 for a signed-in non-admin.
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (user.role !== "admin") {
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

  // Vendor calls fail in all the usual ways (bad key, network error, SDK
  // throw) — wrap so the admin UI gets a structured message instead of an
  // unhandled 500.
  try {
    const result = await provider.testConnection(apiKey, model ?? "", baseUrl);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "The provider test failed with an unknown error.",
      },
      { status: 502 },
    );
  }
}
