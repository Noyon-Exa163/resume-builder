/**
 * Input size caps for the AI routes. Set well above real use so they never
 * cut off a genuine request — a 50-page CV is roughly 150,000 characters —
 * while still bounding what one call can spend on the shared provider key.
 */

/** Extracted text of an uploaded resume or attached file. */
export const AI_ATTACHED_TEXT_MAX_CHARS = 300_000;

/** One chat message typed by the user. */
export const AI_MESSAGE_MAX_CHARS = 20_000;

/** One prior chat turn sent back as history (assistant replies can be long). */
export const AI_TURN_MAX_CHARS = 100_000;

/** Optional extra instruction on an import. */
export const AI_INSTRUCTION_MAX_CHARS = 5_000;
