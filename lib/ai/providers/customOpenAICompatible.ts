import { createOpenAICompatibleProvider } from "./openaiCompatible";

/**
 * Generic OpenAI-compatible chat-completions slot. The caller must supply
 * `baseUrl` (Settings "custom" provider). Same request shape as OpenRouter
 * and DeepSeek, including `response_format: { type: "json_object" }` on extract.
 */
export const customOpenAICompatibleProvider = createOpenAICompatibleProvider({
  id: "customOpenAICompatible",
  label: "Custom OpenAI-compatible",
});
