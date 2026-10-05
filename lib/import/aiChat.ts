import type { ResumeData } from "@/lib/schema/resume";
import type { AIChatMessage } from "@/lib/ai/types";
import type { ChatStreamEvent, ChatTurnStage } from "@/lib/ai/chatTypes";

export interface AiChatTurnResult {
  reply: string;
  resumeUpdate?: unknown;
  model?: string;
  totalTokens?: number;
}

/**
 * A response with no parseable `{ error }` body means something outside our
 * own route handler failed the request — most commonly the hosting
 * platform's own gateway timing out a slow function before our code (and
 * its friendlier lib/ai/http.ts timeout) got a chance to respond. Map the
 * common cases to something a non-technical user can act on, per AGENTS.md's
 * content rules for AI/import errors.
 */
function describeHttpFailure(status: number): string {
  switch (status) {
    case 504:
    case 502:
    case 503:
      return "The AI took too long to respond or is temporarily unavailable. Try again — if it keeps happening, try a shorter message or a smaller file.";
    case 429:
      return "The AI provider is rate-limiting requests right now. Wait a moment, then try again.";
    case 401:
    case 403:
      return "The AI provider rejected the request. Ask an admin to check the API key in AI Settings.";
    default:
      return `AI chat failed (status ${status}). Try again.`;
  }
}

/**
 * Client-side entry point for the editor's AI chat panel — talks only to
 * /api/import/ai-chat (never lib/ai/lib/storage/settings directly; those are
 * server-only). `history` should already be truncated by the caller.
 */
export async function sendChatMessage(args: {
  resume: ResumeData;
  history: AIChatMessage[];
  message: string;
  /** Text of a file attached in THIS message — treated as an import. */
  attachedFileText?: string;
  /** Text of a file attached earlier in the conversation — reference only,
   *  so a follow-up can correct or complete the import without re-attaching. */
  sourceFileText?: string;
  /** Called as the server reports real milestones while it works. */
  onStage?: (stage: ChatTurnStage) => void;
}): Promise<AiChatTurnResult> {
  const { onStage, ...payload } = args;
  let res: Response;
  try {
    res = await fetch("/api/import/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Couldn't reach the server. Check your internet connection and try again.",
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || describeHttpFailure(res.status));
  }

  return readChatStream(res, onStage);
}

/**
 * Reads the route's newline-delimited JSON stream: stage events as they
 * arrive, then one result or error. A stream that ends without either was
 * cut off by something outside our code (usually a gateway timeout).
 */
async function readChatStream(
  res: Response,
  onStage?: (stage: ChatTurnStage) => void,
): Promise<AiChatTurnResult> {
  if (!res.body) throw new Error(describeHttpFailure(504));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function handleLine(line: string): AiChatTurnResult | undefined {
    if (!line.trim()) return undefined;
    const event = JSON.parse(line) as ChatStreamEvent;
    if (event.type === "stage") onStage?.(event.stage);
    if (event.type === "error") throw new Error(event.error);
    if (event.type === "result") {
      return {
        reply: event.reply,
        resumeUpdate: event.resumeUpdate,
        model: event.model,
        totalTokens: event.totalTokens,
      };
    }
    return undefined;
  }

  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const result = handleLine(line);
        if (result) return result;
      }
      if (done) break;
    }
    const result = handleLine(buffer);
    if (result) return result;
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(describeHttpFailure(504));
    throw error;
  }
  throw new Error(describeHttpFailure(504));
}
