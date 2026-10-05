import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  AI_CHAT_RULE,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/rateLimit";
import {
  AI_ATTACHED_TEXT_MAX_CHARS,
  AI_MESSAGE_MAX_CHARS,
  AI_TURN_MAX_CHARS,
} from "@/lib/ai/limits";
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
import type { ChatStreamEvent, ChatTurnStage } from "@/lib/ai/chatTypes";
import type { ResolvedProvider } from "@/lib/ai/resolveConfiguredProvider";

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
  content: z.string().max(AI_TURN_MAX_CHARS),
});

const AiChatRequestSchema = z.object({
  resume: ResumeDataSchema,
  history: z.array(ChatTurnSchema).max(AI_CHAT_HISTORY_LIMIT),
  message: z.string().min(1).max(AI_MESSAGE_MAX_CHARS),
  attachedFileText: z.string().max(AI_ATTACHED_TEXT_MAX_CHARS).optional(),
  sourceFileText: z.string().max(AI_ATTACHED_TEXT_MAX_CHARS).optional(),
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

  const limit = await checkRateLimit(user.id, AI_CHAT_RULE);
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
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      const outcome = await runChatTurn(
        parsed.data,
        resolved.result,
        (stage) => send({ type: "stage", stage }),
      );
      send(
        outcome.ok
          ? { type: "result", ...outcome.result }
          : { type: "error", error: outcome.error },
      );
      controller.close();
    },
  });

  // Newline-delimited JSON: a few "stage" events while the AI works, then
  // exactly one "result" or "error". Failures before this point (auth, rate
  // limit, bad input, no provider) still use plain JSON error responses.
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

type ChatTurnOutcome =
  | {
      ok: true;
      result: {
        reply: string;
        resumeUpdate?: ResumeData;
        model?: string;
        totalTokens?: number;
      };
    }
  | { ok: false; error: string };

async function runChatTurn(
  data: z.infer<typeof AiChatRequestSchema>,
  { provider, config }: ResolvedProvider,
  onStage: (stage: ChatTurnStage) => void,
): Promise<ChatTurnOutcome> {
  const incompleteReply: ChatTurnOutcome = {
    ok: false,
    error: "The AI didn't return a response. Try rephrasing your message.",
  };

  try {
    // Route plain Q&A turns to a cheap/free model — only meaningful on
    // OpenRouter, whose `openrouter/free` router picks a live free model per
    // request (see lib/ai/chatRouting.ts). An attached file always goes
    // through the full edit-capable path since it may be a resume to import.
    const canRouteToQa = provider.id === "openrouter" && !data.attachedFileText;
    if (canRouteToQa) onStage("deciding");
    const intent = canRouteToQa
      ? await classifyChatIntent(provider, config, data.message)
      : "edit";

    onStage("writing");
    if (intent === "question") {
      const { system, messages } = buildQaChatPrompt({
        resume: data.resume,
        history: data.history,
        message: data.message,
        sourceFileText: data.sourceFileText,
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
        sessionId: data.resume.meta.id,
      });
      onStage("checking");
      const json = parseModelJson(result.content);
      const envelope = QaEnvelopeSchema.safeParse(json);
      const fallbackReply = result.content.trim();
      if (!envelope.success && !fallbackReply) return incompleteReply;
      return {
        ok: true,
        result: {
          reply: envelope.success ? envelope.data.reply : fallbackReply,
          model: result.model,
          totalTokens: result.totalTokens,
        },
      };
    }

    const { system, messages } = buildChatPrompt({
      resume: data.resume,
      history: data.history,
      message: data.message,
      attachedFileText: data.attachedFileText,
      sourceFileText: data.sourceFileText,
    });
    const result = await provider.chat(
      {
        system,
        messages,
        jsonMode: true,
        temperature: 0,
        maxTokens: EXTRACT_MAX_TOKENS,
        sessionId: data.resume.meta.id,
      },
      config.apiKey,
      config.model ?? "",
      config.baseUrl,
    );

    onStage("checking");
    const json = parseModelJson(result.content);
    const envelope = ChatEnvelopeSchema.safeParse(json);
    if (!envelope.success) {
      // The provider's "JSON mode" here is a prompt instruction, not an
      // API-enforced constraint (see lib/ai/providers/anthropic.ts) — for
      // conversational turns the model sometimes answers in plain prose
      // instead of the envelope. Treat that raw text as the reply rather
      // than failing the turn; there's just no resume update to apply.
      const fallbackReply = result.content.trim();
      if (!fallbackReply) return incompleteReply;
      // With a file attached the model was almost certainly returning the
      // imported resume, so unparseable output means it was cut off or
      // malformed — posting that as a chat reply would look like a
      // successful turn that just forgot to apply anything.
      if (data.attachedFileText) {
        return {
          ok: false,
          error:
            "The AI's response for that file was incomplete, so nothing was imported. Try again — if it keeps happening, try a shorter file.",
        };
      }
      return {
        ok: true,
        result: {
          reply: fallbackReply,
          model: result.model,
          totalTokens: result.totalTokens,
        },
      };
    }

    let resumeUpdate: ResumeData | undefined;
    if (envelope.data.resume) {
      const validated = ResumeDataSchema.safeParse(
        normalizeAndValidate(envelope.data.resume as DeepPartial<ResumeData>),
      );
      // Degrade gracefully: still return the conversational reply even if the
      // model's resume payload didn't validate, rather than failing the turn.
      if (validated.success) resumeUpdate = validated.data;
      else if (data.attachedFileText) {
        return {
          ok: false,
          error:
            "The AI returned resume data in a format that couldn't be applied, so nothing was imported. Try again.",
        };
      }
    }

    return {
      ok: true,
      result: {
        reply: envelope.data.reply,
        resumeUpdate,
        model: result.model,
        totalTokens: result.totalTokens,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "AI chat failed.",
    };
  }
}
