import type { ResumeData } from "@/lib/schema/resume";
import type { AIChatMessage } from "@/lib/ai/types";

export interface AiChatTurnResult {
  reply: string;
  resumeUpdate?: unknown;
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
  const res = await fetch("/api/import/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `AI chat failed (status ${res.status})`);
  }

  return res.json();
}
