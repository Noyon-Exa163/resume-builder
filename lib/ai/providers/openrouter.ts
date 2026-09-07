import { createOpenAICompatibleProvider } from "./openaiCompatible";

/**
 * OpenRouter chat-completions — OpenAI-compatible.
 * https://openrouter.ai/docs/api-reference/overview
 *
 * Optional ranking headers (`HTTP-Referer`, `X-OpenRouter-Title`) are omitted;
 * OpenRouter documents them as optional.
 */
export const openrouterProvider = createOpenAICompatibleProvider({
  id: "openrouter",
  label: "OpenRouter",
  defaultBaseUrl: "https://openrouter.ai/api/v1",
});
