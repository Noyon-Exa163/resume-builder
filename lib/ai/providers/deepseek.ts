import { createOpenAICompatibleProvider } from "./openaiCompatible";

/**
 * DeepSeek chat-completions — OpenAI-compatible.
 * Base URL from https://api-docs.deepseek.com/ (`https://api.deepseek.com`,
 * POST `/chat/completions`). `https://api.deepseek.com/v1` is also accepted
 * by their OpenAI-SDK path; we default to the documented host without `/v1`.
 */
export const deepseekProvider = createOpenAICompatibleProvider({
  id: "deepseek",
  label: "DeepSeek",
  defaultBaseUrl: "https://api.deepseek.com",
});
