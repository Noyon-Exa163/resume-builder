import type { ResumeData } from "@/lib/schema/resume";

export type ChatMessageRole = "user" | "assistant";

export interface ChatFileAttachment {
  name: string;
  /** detectFormat() result: "pdf" | "docx" | "markdown" | "text" | "json" */
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
