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
}

export interface AIChatResult {
  content: string;
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
