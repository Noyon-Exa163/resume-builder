import type { ResumeData } from "@/lib/schema/resume";
import { RESUME_SCHEMA_DESCRIPTION } from "./extractionPrompt";

/**
 * Prompt for the "refine with AI" bar in the editor — unlike extraction
 * (blank slate, source text -> resume), this hands the model the *current*
 * resume and a natural-language instruction, asking for the full resume back
 * so the same `normalizeAndValidate` + `importInto` path used by import can
 * apply the result without a separate merge step.
 */
export function buildRefinePrompt(resume: ResumeData, instruction: string): string {
  return [
    "You are helping refine an existing resume. Apply ONLY the change requested below — do not rewrite, reorder, or reword anything the instruction doesn't ask you to touch.",
    "Return a single JSON object matching the shape below, containing the FULL updated resume (not just the changed fields). Do not invent employers, dates, degrees, or skills that aren't already present or explicitly requested.",
    "",
    "JSON shape:",
    RESUME_SCHEMA_DESCRIPTION,
    "",
    "Current resume (JSON):",
    JSON.stringify(resume),
    "",
    "Requested change:",
    instruction.trim(),
  ].join("\n");
}
