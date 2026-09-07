import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { resolveConfiguredProvider } from "@/lib/ai/resolveConfiguredProvider";
import { buildRefinePrompt } from "@/lib/ai/refinePrompt";
import { EXTRACT_MAX_TOKENS, parseModelJson } from "@/lib/ai/http";
import { ResumeDataSchema } from "@/lib/schema/resume";

/**
 * POST /api/import/ai-refine — the editor's "refine with AI" prompt bar.
 * Sends the current resume + a natural-language instruction to the admin's
 * configured provider's generic chat() (no forced-JSON-schema tool call like
 * extraction uses — refine reuses the plain chat capability every provider
 * already implements) and asks for the full resume back, so the client can
 * apply the result through the exact same path as a file import.
 */

const AiRefineRequestSchema = z.object({
  resume: ResumeDataSchema,
  instruction: z.string().min(1),
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

  const parsed = AiRefineRequestSchema.safeParse(body);
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
    const prompt = buildRefinePrompt(parsed.data.resume, parsed.data.instruction);
    const result = await provider.chat(
      {
        messages: [{ role: "user", content: prompt }],
        jsonMode: true,
        temperature: 0,
        maxTokens: EXTRACT_MAX_TOKENS,
      },
      config.apiKey,
      config.model ?? "",
      config.baseUrl,
    );

    const json = parseModelJson(result.content);
    if (json === null) {
      return NextResponse.json(
        {
          error:
            "The AI's response wasn't valid JSON. Try rephrasing your instruction.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ json });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "AI refinement failed.",
      },
      { status: 502 },
    );
  }
}
