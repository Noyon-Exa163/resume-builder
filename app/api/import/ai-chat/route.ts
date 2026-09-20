import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { resolveConfiguredProvider } from "@/lib/ai/resolveConfiguredProvider";
import {
  buildChatPrompt,
  buildQaChatPrompt,
  AI_CHAT_HISTORY_LIMIT,
} from "@/lib/ai/chatPrompt";
import { classifyChatIntent, runQaChat } from "@/lib/ai/chatRouting";
import { EXTRACT_MAX_TOKENS, parseModelJson } from "@/lib/ai/http";
import { ResumeDataSchema } from "@/lib/schema/resume";
import { normalizeAndValidate, type DeepPartial } from "@/lib/schema/normalize";
import type { ResumeData } from "@/lib/schema/resume";

/**
 * POST /api/import/ai-chat — the editor's multi-turn AI chat panel. On
 * OpenRouter, a cheap classifier call first decides whether the turn is a
 * plain question or a resume edit (see lib/ai/chatRouting.ts); questions run
 * a lighter, cheaper Q&A-only prompt, edits go through the full pipeline
 * below: send the current resume, a bounded slice of prior turns, and the
 * new message to the admin's configured provider, and ask for a JSON
 * envelope — a conversational reply, plus (only if the model decided this
 * turn warrants one) the full updated resume. Presence of `resume` in the
 * response is the "should this apply" signal — the client applies it
 * directly if present.
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

const QaEnvelopeSchema = z.object({
  reply: z.string(),
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
    // Route plain Q&A turns to a cheap/free model — only meaningful on
    // OpenRouter, whose `openrouter/free` router picks a live free model per
    // request (see lib/ai/chatRouting.ts). An attached file always goes
    // through the full edit-capable path since it may be a resume to import.
    const canRouteToQa = provider.id === "openrouter" && !parsed.data.attachedFileText;
    const intent = canRouteToQa
      ? await classifyChatIntent(provider, config, parsed.data.message)
      : "edit";

    if (intent === "question") {
      const { system, messages } = buildQaChatPrompt({
        resume: parsed.data.resume,
        history: parsed.data.history,
        message: parsed.data.message,
      });
      const result = await runQaChat(provider, config, {
        system,
        messages,
        jsonMode: true,
        temperature: 0,
        // Same resume = same conversation thread — keeps OpenRouter routing
        // every turn to the same upstream instance so its prompt cache (for
        // providers that support one) can actually hit across turns. Pure
        // routing hint, ignored by every other provider.
        sessionId: parsed.data.resume.meta.id,
      });
      const json = parseModelJson(result.content);
      const envelope = QaEnvelopeSchema.safeParse(json);
      const fallbackReply = result.content.trim();
      if (!envelope.success && !fallbackReply) {
        return NextResponse.json(
          {
            error: "The AI didn't return a response. Try rephrasing your message.",
          },
          { status: 502 },
        );
      }
      return NextResponse.json({
        reply: envelope.success ? envelope.data.reply : fallbackReply,
        model: result.model,
        totalTokens: result.totalTokens,
      });
    }

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
        sessionId: parsed.data.resume.meta.id,
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
      // With a file attached the model was almost certainly returning the
      // imported resume, so unparseable output means it was cut off or
      // malformed — posting that as a chat reply would look like a
      // successful turn that just forgot to apply anything.
      if (parsed.data.attachedFileText) {
        return NextResponse.json(
          {
            error:
              "The AI's response for that file was incomplete, so nothing was imported. Try again — if it keeps happening, try a shorter file.",
          },
          { status: 502 },
        );
      }
      return NextResponse.json({
        reply: fallbackReply,
        model: result.model,
        totalTokens: result.totalTokens,
      });
    }

    let resumeUpdate: ResumeData | undefined;
    if (envelope.data.resume) {
      const validated = ResumeDataSchema.safeParse(
        normalizeAndValidate(envelope.data.resume as DeepPartial<ResumeData>),
      );
      // Degrade gracefully: still return the conversational reply even if the
      // model's resume payload didn't validate, rather than failing the turn.
      if (validated.success) resumeUpdate = validated.data;
      else if (parsed.data.attachedFileText) {
        return NextResponse.json(
          {
            error:
              "The AI returned resume data in a format that couldn't be applied, so nothing was imported. Try again.",
          },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({
      reply: envelope.data.reply,
      resumeUpdate,
      model: result.model,
      totalTokens: result.totalTokens,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI chat failed.",
      },
      { status: 502 },
    );
  }
}
