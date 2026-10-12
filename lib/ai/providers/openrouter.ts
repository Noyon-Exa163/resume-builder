import { createOpenAICompatibleProvider } from "./openaiCompatible";

/**
 * OpenRouter chat-completions — OpenAI-compatible.
 * https://openrouter.ai/docs/api-reference/overview
 *
 * Optional ranking headers (`HTTP-Referer`, `X-OpenRouter-Title`) are omitted;
 * OpenRouter documents them as optional.
 *
 * `openrouter/auto` is OpenRouter's own auto-routing model id — used when an
 * admin leaves Model blank in AI Settings, so a specific model isn't required.
 */
export const OPENROUTER_AUTO_MODEL = "openrouter/auto";

export const openrouterProvider = createOpenAICompatibleProvider({
  id: "openrouter",
  label: "OpenRouter",
  defaultBaseUrl: "https://openrouter.ai/api/v1",
  defaultModel: OPENROUTER_AUTO_MODEL,
  // The auto-router often lands on a "thinking" model, and left alone that
  // model spends most of `max_tokens` (and 20+ seconds) reasoning before it
  // writes a word — on a resume import that is the difference between ~7s
  // and a platform timeout. Nothing this app asks for needs it: every call
  // is extraction or a short reply. "minimal" rather than "none" because
  // some models reject switching reasoning off outright.
  optionalBody: { reasoning: { effort: "minimal" } },
  sendsSessionId: true,
});
