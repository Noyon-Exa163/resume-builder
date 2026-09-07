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
export const openrouterProvider = createOpenAICompatibleProvider({
  id: "openrouter",
  label: "OpenRouter",
  defaultBaseUrl: "https://openrouter.ai/api/v1",
  defaultModel: "openrouter/auto",
});
