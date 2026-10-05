import type { ResumeData } from "@/lib/schema/resume";

export type ChatMessageRole = "user" | "assistant";

export interface ChatFileAttachment {
  name: string;
  /** detectFormat() result: "pdf" | "docx" | "markdown" | "text" | "json" | "image" */
  format: string;
}

/**
 * One turn in the editor's AI chat panel. Persisted client-side (see
 * lib/storage/aiChat/) — this is an app-chrome concern, never merged into
 * ResumeData (AGENTS.md's two-token-systems split applies to data shape too:
 * chat transcripts aren't resume content).
 */
export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  /** The user's typed instruction, or the assistant's conversational reply. */
  content: string;
  createdAt: string;
  /** Present only on a user message that came from a file attach. */
  attachment?: ChatFileAttachment;
  /** Text extracted from that attached file, kept so follow-up messages
   *  ("you missed my older jobs") can still see the source. Never sent as
   *  conversation history — see sourceFileText in lib/import/aiChat.ts. */
  sourceText?: string;
  /** Present only on an assistant message that changed the resume — the
   *  revert target when this turn is later edited or regenerated. */
  appliedChange?: {
    previousResume: ResumeData;
  };
  /** Present only on an assistant message that came from an actual AI
   *  call (never the synthetic "Imported your resume…" reply for a direct
   *  .json project-file import). See lib/ai/types.ts's AIChatResult. */
  model?: string;
  totalTokens?: number;
}

/** Real milestones the chat route reports while it works on a turn. */
export type ChatTurnStage = "deciding" | "writing" | "checking";

/** One line of the ai-chat route's streamed (newline-delimited JSON) response. */
export type ChatStreamEvent =
  | { type: "stage"; stage: ChatTurnStage }
  | {
      type: "result";
      reply: string;
      resumeUpdate?: ResumeData;
      model?: string;
      totalTokens?: number;
    }
  | { type: "error"; error: string };
