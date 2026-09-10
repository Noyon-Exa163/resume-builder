import type { ResumeData } from "@/lib/schema/resume";
import type { AIChatMessage } from "@/lib/ai/types";

export interface AiChatTurnResult {
  reply: string;
  resumeUpdate?: unknown;
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
  attachedFileText?: string;
}): Promise<AiChatTurnResult> {
  let res: Response;
  try {
    res = await fetch("/api/import/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
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

  return res.json();
}
