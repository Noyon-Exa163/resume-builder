export type AIProviderId =
  "gemini" | "anthropic" | "openrouter" | "deepseek" | "customOpenAICompatible";

export interface AIExtractResumeInput {
  rawText: string;
  /** User-editable instruction appended to the shared extraction prompt. */
  customInstruction?: string;
  /** JSON-shape description of ResumeData, built by extractionPrompt.ts. */
  schemaDescription: string;
}

export interface AIExtractResumeResult {
  /** Parsed JSON candidate — caller validates with ResumeDataSchema. */
  json: unknown;
  /** Raw model text, kept for debugging/error surfacing. */
  raw: string;
}

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIChatInput {
  system?: string;
  messages: AIChatMessage[];
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  /**
   * Stable per-conversation key (this app uses the resume id) so OpenRouter
   * routes every turn of the same conversation to the same upstream
   * provider instance instead of load-balancing across instances — a
   * prerequisite for that provider's own prompt caching to ever hit across
   * turns. Pure routing hint: never affects prompt content or how a reply
   * is interpreted. Ignored by providers other than OpenRouter.
   */
  sessionId?: string;
  /**
   * Hard ceiling for this one provider call, response body included.
   * Defaults to PROVIDER_FETCH_TIMEOUT_MS; a route that makes several calls
   * in one request passes what is left of its overall budget.
   */
  timeoutMs?: number;
}

export interface AIChatResult {
  content: string;
  /** Total tokens (prompt + completion) the provider reports for this
   *  request, when available. */
  totalTokens?: number;
  /** The model that actually served the request — may differ from the
   *  requested model id for a provider that auto-routes (e.g. OpenRouter's
   *  `openrouter/auto` and `openrouter/free`). Falls back to the requested
   *  model for a provider that doesn't echo it back (Gemini). */
  model?: string;
}

export interface AIConnectionTestResult {
  ok: boolean;
  error?: string;
}

/**
 * Depend on this, never on a concrete provider — see AGENTS.md §1.6. Every
 * adapter under lib/ai/providers/ implements the same shape so the rest of
 * the app (import parsing, settings "test connection") never branches on
 * which provider is configured.
 */
export interface AIProvider {
  id: AIProviderId;
  extractResumeData(
    input: AIExtractResumeInput,
    apiKey: string,
    model: string,
    baseUrl?: string,
  ): Promise<AIExtractResumeResult>;
  chat(
    input: AIChatInput,
    apiKey: string,
    model: string,
    baseUrl?: string,
  ): Promise<AIChatResult>;
  testConnection(
    apiKey: string,
    model: string,
    baseUrl?: string,
  ): Promise<AIConnectionTestResult>;
}
