import { formatExtractionPrompt } from "../extractionPrompt";
import {
  DEFAULT_CHAT_MAX_TOKENS,
  EXTRACT_MAX_TOKENS,
  TEST_MAX_TOKENS,
  TEST_USER_MESSAGE,
  chatCompletionsUrl,
  httpError,
  parseModelJson,
  readErrorMessage,
  requireApiKey,
} from "../http";
import type {
  AIChatInput,
  AIChatResult,
  AIConnectionTestResult,
  AIExtractResumeInput,
  AIExtractResumeResult,
  AIProvider,
  AIProviderId,
} from "../types";

interface OpenAICompatibleOptions {
  id: AIProviderId;
  /** Human-readable name used in error messages. */
  label: string;
  /** Used when the caller does not pass `baseUrl`. */
  defaultBaseUrl?: string;
  /** Used when the caller does not pass `model` (or passes an empty one). */
  defaultModel?: string;
  extraHeaders?: Record<string, string>;
}

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

/**
 * Shared OpenAI-compatible chat-completions transport (OpenRouter, DeepSeek,
 * custom OpenAI-compatible slot). `response_format: { type: "json_object" }`
 * is the documented JSON-mode flag for these APIs.
 */
export function createOpenAICompatibleProvider(
  options: OpenAICompatibleOptions,
): AIProvider {
  const resolveBaseUrl = (baseUrl?: string): string => {
    const resolved = (baseUrl ?? options.defaultBaseUrl)?.trim();
    if (!resolved) {
      throw new Error(
        `${options.label} requires a base URL (OpenAI-compatible /v1 host).`,
      );
    }
    return resolved;
  };

  const resolveModel = (model: string): string => {
    const resolved = model.trim() || options.defaultModel?.trim();
    if (!resolved) {
      throw new Error(`${options.label} requires a model.`);
    }
    return resolved;
  };

  const request = async (args: {
    apiKey: string;
    model: string;
    baseUrl?: string;
    messages: ChatCompletionMessage[];
    maxTokens: number;
    temperature?: number;
    jsonObject?: boolean;
  }): Promise<string> => {
    requireApiKey(args.apiKey, options.label);
    const url = chatCompletionsUrl(resolveBaseUrl(args.baseUrl));
    const body: Record<string, unknown> = {
      model: resolveModel(args.model),
      messages: args.messages,
      max_tokens: args.maxTokens,
    };
    if (args.temperature !== undefined) body.temperature = args.temperature;
    if (args.jsonObject) {
      // DeepSeek requires the prompt itself to mention JSON when this is set,
      // otherwise the request can hang generating whitespace.
      // https://api-docs.deepseek.com/api/create-chat-completion/
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
        ...options.extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw httpError(
        options.label,
        response.status,
        await readErrorMessage(response),
      );
    }

    const json = (await response.json()) as ChatCompletionResponse;
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error(`${options.label} returned no message content.`);
    }
    return content;
  };

  return {
    id: options.id,

    async extractResumeData(
      input: AIExtractResumeInput,
      apiKey: string,
      model: string,
      baseUrl?: string,
    ): Promise<AIExtractResumeResult> {
      const raw = await request({
        apiKey,
        model,
        baseUrl,
        messages: [
          {
            role: "system",
            content:
              "You extract structured resume data. Respond with a single JSON object only — no markdown.",
          },
          { role: "user", content: formatExtractionPrompt(input) },
        ],
        maxTokens: EXTRACT_MAX_TOKENS,
        temperature: 0,
        jsonObject: true,
      });
      return { json: parseModelJson(raw), raw };
    },

    async chat(
      input: AIChatInput,
      apiKey: string,
      model: string,
      baseUrl?: string,
    ): Promise<AIChatResult> {
      const messages: ChatCompletionMessage[] = [];
      if (input.system) {
        messages.push({ role: "system", content: input.system });
      }
      for (const message of input.messages) {
        messages.push({ role: message.role, content: message.content });
      }
      const content = await request({
        apiKey,
        model,
        baseUrl,
        messages,
        maxTokens: input.maxTokens ?? DEFAULT_CHAT_MAX_TOKENS,
        temperature: input.temperature,
        jsonObject: input.jsonMode,
      });
      return { content };
    },

    async testConnection(
      apiKey: string,
      model: string,
      baseUrl?: string,
    ): Promise<AIConnectionTestResult> {
      try {
        await request({
          apiKey,
          model,
          baseUrl,
          messages: [{ role: "user", content: TEST_USER_MESSAGE }],
          maxTokens: TEST_MAX_TOKENS,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
