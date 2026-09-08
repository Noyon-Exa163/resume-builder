import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { resolveConfiguredProvider } from "@/lib/ai/resolveConfiguredProvider";
import { buildChatPrompt, AI_CHAT_HISTORY_LIMIT } from "@/lib/ai/chatPrompt";
import { EXTRACT_MAX_TOKENS, parseModelJson } from "@/lib/ai/http";
import { ResumeDataSchema } from "@/lib/schema/resume";
import { normalizeAndValidate, type DeepPartial } from "@/lib/schema/normalize";
import type { ResumeData } from "@/lib/schema/resume";

/**
 * POST /api/import/ai-chat — the editor's multi-turn AI chat panel. Sends
 * the current resume, a bounded slice of prior turns, and the new message to
 * the admin's configured provider and asks for a JSON envelope: a
 * conversational reply, plus (only if the model decided this turn warrants
 * one) the full updated resume. Presence of `resume` in the response is the
 * "should this apply" signal — the client applies it directly if present.
 */

const ChatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const AiChatRequestSchema = z.object({
  resume: ResumeDataSchema,
  history: z.array(ChatTurnSchema).max(AI_CHAT_HISTORY_LIMIT),
  message: z.string().min(1),
  attachedFileText: z.string().optional(),
});

const ChatEnvelopeSchema = z.object({
  reply: z.string(),
  resume: z.unknown().optional(),
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

  const parsed = AiChatRequestSchema.safeParse(body);
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
    const { system, messages } = buildChatPrompt({
      resume: parsed.data.resume,
      history: parsed.data.history,
      message: parsed.data.message,
      attachedFileText: parsed.data.attachedFileText,
    });
    const result = await provider.chat(
      {
        system,
        messages,
        jsonMode: true,
        temperature: 0,
        maxTokens: EXTRACT_MAX_TOKENS,
      },
      config.apiKey,
      config.model ?? "",
      config.baseUrl,
    );

    const json = parseModelJson(result.content);
    const envelope = ChatEnvelopeSchema.safeParse(json);
    if (!envelope.success) {
      // The provider's "JSON mode" here is a prompt instruction, not an
      // API-enforced constraint (see lib/ai/providers/anthropic.ts) — for
      // conversational turns the model sometimes answers in plain prose
      // instead of the envelope. Treat that raw text as the reply rather
      // than failing the turn; there's just no resume update to apply.
      const fallbackReply = result.content.trim();
      if (!fallbackReply) {
        return NextResponse.json(
          {
            error: "The AI didn't return a response. Try rephrasing your message.",
          },
          { status: 502 },
        );
      }
      return NextResponse.json({ reply: fallbackReply });
    }

    let resumeUpdate: ResumeData | undefined;
    if (envelope.data.resume) {
      const validated = ResumeDataSchema.safeParse(
        normalizeAndValidate(envelope.data.resume as DeepPartial<ResumeData>),
      );
      // Degrade gracefully: still return the conversational reply even if the
      // model's resume payload didn't validate, rather than failing the turn.
      if (validated.success) resumeUpdate = validated.data;
    }

    return NextResponse.json({ reply: envelope.data.reply, resumeUpdate });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI chat failed.",
      },
      { status: 502 },
    );
  }
}
