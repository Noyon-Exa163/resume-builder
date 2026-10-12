import type { AIProviderConfig } from "@/lib/storage/settings/types";
import {
  parseModelJson,
  PROVIDER_FETCH_TIMEOUT_MS,
  QA_CHAT_MAX_TOKENS,
} from "./http";
import { DEFAULT_CHAT_MODEL_ID } from "./chatModels";
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

const OPENROUTER_AUTO_MODEL = "openrouter/auto";

/** The classifier only picks a route — never let it eat the turn's budget. */
const CLASSIFIER_TIMEOUT_MS = 8_000;

/** A fallback attempt with less time than this left would only time out too. */
const MIN_ATTEMPT_MS = 5_000;

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
        timeoutMs: CLASSIFIER_TIMEOUT_MS,
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

/**
 * Tries each model in order, returning the first success. `input.timeoutMs`
 * is the budget for ALL attempts together, so a slow first model can't push
 * the request past the platform's limit by handing a fresh timeout to the
 * next one. `firstAttemptCapMs` keeps a best-effort first choice from using
 * the whole budget and leaving nothing for the fallback.
 */
async function chatWithFallback(
  provider: AIProvider,
  config: AIProviderConfig,
  input: AIChatInput,
  modelCandidates: string[],
  firstAttemptCapMs?: number,
): Promise<AIChatResult> {
  const deadline = Date.now() + (input.timeoutMs ?? PROVIDER_FETCH_TIMEOUT_MS);
  let lastError: unknown;
  for (const [index, model] of modelCandidates.entries()) {
    const remainingMs = deadline - Date.now();
    if (index > 0 && remainingMs < MIN_ATTEMPT_MS) break;
    const isLast = index === modelCandidates.length - 1;
    const timeoutMs =
      firstAttemptCapMs && !isLast
        ? Math.min(remainingMs, firstAttemptCapMs)
        : remainingMs;
    try {
      return await provider.chat(
        { ...input, timeoutMs },
        config.apiKey,
        model,
        config.baseUrl,
      );
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("All model candidates failed.");
}

/** How long the free router gets before a Q&A turn moves to the paid model. */
const QA_FREE_ATTEMPT_TIMEOUT_MS = 15_000;

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
    [QA_FREE_ROUTER_MODEL, config.model?.trim() || OPENROUTER_AUTO_MODEL],
    QA_FREE_ATTEMPT_TIMEOUT_MS,
  );
}

/**
 * Runs an edit-capable chat turn (a resume import or an edit).
 *
 * On OpenRouter the model is the one the person picked in the chat box,
 * else the admin's default from AI Settings — never the bare auto-router,
 * which lands on models too slow or too flaky for a whole-resume response.
 * The auto-router stays as the fallback in case the chosen model is ever
 * unavailable.
 *
 * Both ids must already be checked against the allowed list by the caller.
 * Other providers have a single configured model and ignore them.
 */
export async function runEditChat(
  provider: AIProvider,
  config: AIProviderConfig,
  input: AIChatInput,
  options: { pickedModel?: string; defaultModel?: string } = {},
): Promise<AIChatResult> {
  if (provider.id !== "openrouter") {
    return chatWithFallback(provider, config, input, [
      config.model?.trim() ?? "",
    ]);
  }
  const model =
    options.pickedModel || options.defaultModel || DEFAULT_CHAT_MODEL_ID;
  return chatWithFallback(provider, config, input, [
    model,
    OPENROUTER_AUTO_MODEL,
  ]);
}
