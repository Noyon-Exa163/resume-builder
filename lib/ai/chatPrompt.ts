import type { ResumeData } from "@/lib/schema/resume";
import type { AIChatMessage } from "./types";
import { RESUME_SCHEMA_DESCRIPTION } from "./extractionPrompt";

/** How many prior turns are sent to the model per request — older turns
 *  stay in the persisted transcript and the UI, just not the wire payload. */
export const AI_CHAT_HISTORY_LIMIT = 10;

/**
 * Prompt for the editor's AI chat panel. Unlike the old one-shot refine
 * prompt, this asks the model to decide FOR ITSELF, per message, whether the
 * resume needs to change: a question gets a reply only, an instruction gets
 * a reply plus the full updated resume. Presence/absence of `resume` in the
 * JSON envelope is that decision — there's no separate intent flag to keep
 * in sync with it.
 */
export function buildChatPrompt(input: {
  resume: ResumeData;
  history: AIChatMessage[];
  message: string;
  attachedFileText?: string;
}): { system: string; messages: AIChatMessage[] } {
  return {
    system: buildChatSystemPrompt(input.resume, Boolean(input.attachedFileText)),
    messages: [...input.history, { role: "user", content: buildUserTurn(input) }],
  };
}

function buildChatSystemPrompt(resume: ResumeData, hasAttachment: boolean): string {
  const parts = [
    "Your entire response must be RAW JSON: a single JSON object, nothing before or after it, no markdown code fences, no bullet lists or headings outside the JSON. This applies no matter what the user asks, including questions that would normally invite a bulleted answer — put that content, as plain sentences, inside the \"reply\" string instead.",
    "",
    "You are a resume-editing assistant embedded in a resume builder's chat panel. You can see the user's current resume as JSON and a short recent conversation history.",
    "",
    "For EVERY new message, decide whether it requires a change to the resume:",
    '- A question, request for advice, or general conversation (e.g. "What skills should I add for a DevOps role?") needs a reply only — do NOT include a "resume" field in your response, and do not change anything.',
    '- An instruction to change something (e.g. "Shorten the summary", "Add a bullet about leading the migration") means: make ONLY that change and return the FULL updated resume in the "resume" field.',
    "",
    "Keep \"reply\" concise — 1 to 3 sentences, plain prose (no markdown, no bullet characters like \"-\" or \"*\"). Never restate the full resume, never repeat back JSON, never open with a long preamble like \"Sure, I'd be happy to help\". If you changed something, name what changed in a short clause.",
    "",
    "Apply ONLY the change requested — do not rewrite, reorder, or reword anything else. Do not invent employers, dates, degrees, or skills that aren't already present, in the conversation, or in an attached file.",
    'personalInfo.headline should join titles with " • ", never "|".',
    "",
    'The current resume\'s sections and entries each have an "id" field. When you return a section or entry unchanged (or lightly edited) from the current resume, keep its exact "id" value. For a brand-new section or entry, omit "id" entirely — never copy an existing id onto a different section or entry.',
    "",
    "Respond with a single JSON object of exactly this shape, and nothing else:",
    '{ "reply": string, "resume"?: <full resume JSON, see shape below> }',
    "",
    "Resume JSON shape:",
    RESUME_SCHEMA_DESCRIPTION,
    "",
    "Current resume (JSON):",
    JSON.stringify(resume),
  ];

  if (hasAttachment) {
    parts.push(
      "",
      "The user's latest message includes text extracted from an attached file. Decide whether it's a full resume to import (replace current content) or supplementary text for a specific change, based on the user's message and the file content. If importing, return the full resume in \"resume\".",
    );
  }

  return parts.join("\n");
}

function buildUserTurn(input: {
  message: string;
  attachedFileText?: string;
}): string {
  if (!input.attachedFileText) return input.message;
  return [
    input.message || "Here's my resume.",
    "",
    "[Attached file content]",
    input.attachedFileText,
  ].join("\n");
}
