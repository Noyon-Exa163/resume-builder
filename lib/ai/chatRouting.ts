import type { AIProviderConfig } from "@/lib/storage/settings/types";
import { parseModelJson, QA_CHAT_MAX_TOKENS } from "./http";
import type { AIChatInput, AIChatResult, AIProvider } from "./types";

/**
 * Q&A-turn routing — only meaningful for OpenRouter (see resolveConfiguredProvider
 * callers). Routes plain questions to `openrouter/free`, OpenRouter's own
 * router across whatever free models are live right now, instead of a
 * hand-picked free model id that would go stale as OpenRouter's free catalog
 * rotates. Falls back to the admin's configured "edit" model if the free
 * router itself errors out (e.g. platform-wide free-tier throttling).
 */
export const QA_FREE_ROUTER_MODEL = "openrouter/free";

/** Same free router for classification — the prompt is a few dozen tokens either way. */
const CLASSIFIER_MODEL = QA_FREE_ROUTER_MODEL;

export type ChatIntent = "edit" | "question";

const CLASSIFIER_SYSTEM_PROMPT = [
  'Classify the latest user message in a resume-editing chat as "edit" or "question".',
  '"edit": asks to change, add, remove, or rewrite something in the resume (e.g. "shorten the summary", "add a bullet about X", "can you shorten this?", "fix my email").',
  '"question": asks for advice, information, or feedback without asking for a change (e.g. "what skills should I add?", "does this look good?", "how long should a resume be?").',
  'When unsure, classify as "edit" — a missed edit is worse than an unnecessary one.',
  'Respond with RAW JSON only, exactly this shape: { "intent": "edit" | "question" }',
].join("\n");

/**
 * Decides whether a chat turn needs the full edit-capable pipeline or can be
 * answered by the cheap Q&A path. Errors (bad JSON, network, rate limit)
 * default to "edit" — the safe failure mode, since misrouting an edit to the
 * Q&A path means a requested change silently doesn't happen.
 */
export async function classifyChatIntent(
  provider: AIProvider,
  config: AIProviderConfig,
  message: string,
): Promise<ChatIntent> {
  try {
    const result = await provider.chat(
      {
        system: CLASSIFIER_SYSTEM_PROMPT,
        messages: [{ role: "user", content: message }],
        jsonMode: true,
        temperature: 0,
        maxTokens: 20,
      },
      config.apiKey,
      CLASSIFIER_MODEL,
      config.baseUrl,
    );
    const json = parseModelJson(result.content) as { intent?: unknown } | null;
    return json?.intent === "question" ? "question" : "edit";
  } catch {
    return "edit";
  }
}

/** Tries each model in order, returning the first success. */
async function chatWithFallback(
  provider: AIProvider,
  config: AIProviderConfig,
  input: AIChatInput,
  modelCandidates: string[],
): Promise<AIChatResult> {
  let lastError: unknown;
  for (const model of modelCandidates) {
    try {
      return await provider.chat(input, config.apiKey, model, config.baseUrl);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("All Q&A model candidates failed.");
}

/**
 * Runs a Q&A-only chat turn on the free router, falling back to the admin's
 * configured model if the free router is unavailable.
 */
export async function runQaChat(
  provider: AIProvider,
  config: AIProviderConfig,
  input: Omit<AIChatInput, "maxTokens">,
): Promise<AIChatResult> {
  return chatWithFallback(
    provider,
    config,
    { ...input, maxTokens: QA_CHAT_MAX_TOKENS },
    [QA_FREE_ROUTER_MODEL, config.model?.trim() || "openrouter/auto"],
  );
}
