import { formatExtractionPrompt } from "../extractionPrompt";
import {
  DEFAULT_CHAT_MAX_TOKENS,
  EXTRACT_MAX_TOKENS,
  PROVIDER_FETCH_TIMEOUT_MS,
  TEST_MAX_TOKENS,
  TEST_USER_MESSAGE,
  chatCompletionsUrl,
  fetchWithTimeout,
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
  /**
   * Host-specific request fields that are worth sending but not essential.
   * A model that doesn't accept one rejects the whole request (400) rather
   * than ignoring it, so the request is sent once more without them.
   */
  optionalBody?: Record<string, unknown>;
  /** Whether the host documents `session_id` (see AIChatInput.sessionId). */
  sendsSessionId?: boolean;
}

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  /** Some hosts return an error object with a 200 status. */
  error?: { message?: string };
  /** The model that actually served the request — OpenRouter echoes the
   *  resolved model here even when the request asked for an auto-router
   *  id like "openrouter/auto" or "openrouter/free". */
  model?: string;
  usage?: { total_tokens?: number };
}

interface ChatCompletionResult {
  content: string;
  model?: string;
  totalTokens?: number;
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
    sessionId?: string;
    timeoutMs?: number;
  }): Promise<ChatCompletionResult> => {
    requireApiKey(args.apiKey, options.label);
    const url = chatCompletionsUrl(resolveBaseUrl(args.baseUrl));
    const body: Record<string, unknown> = {
      model: resolveModel(args.model),
      messages: args.messages,
      max_tokens: args.maxTokens,
    };
    if (args.temperature !== undefined) body.temperature = args.temperature;
    if (args.sessionId && options.sendsSessionId) {
      body.session_id = args.sessionId;
    }
    if (args.jsonObject) {
      // DeepSeek requires the prompt itself to mention JSON when this is set,
      // otherwise the request can hang generating whitespace.
      // https://api-docs.deepseek.com/api/create-chat-completion/
      body.response_format = { type: "json_object" };
    }

    const deadline = Date.now() + (args.timeoutMs ?? PROVIDER_FETCH_TIMEOUT_MS);
    const post = (payload: Record<string, unknown>) =>
      fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${args.apiKey}`,
            "Content-Type": "application/json",
            ...options.extraHeaders,
          },
          body: JSON.stringify(payload),
        },
        deadline - Date.now(),
      );

    let response = await post({ ...body, ...options.optionalBody });
    if (options.optionalBody && response.status === 400) {
      response = await post(body);
    }

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
      const reason =
        json.error?.message ??
        (json.choices?.[0]?.finish_reason
          ? `finish reason: ${json.choices[0].finish_reason}`
          : undefined);
      throw new Error(
        `${options.label} returned no message content${reason ? ` (${reason})` : ""}.`,
      );
    }
    return {
      content,
      model: json.model,
      totalTokens: json.usage?.total_tokens,
    };
  };

  return {
    id: options.id,

    async extractResumeData(
      input: AIExtractResumeInput,
      apiKey: string,
      model: string,
      baseUrl?: string,
    ): Promise<AIExtractResumeResult> {
      const result = await request({
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
      return { json: parseModelJson(result.content), raw: result.content };
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
      return await request({
        apiKey,
        model,
        baseUrl,
        messages,
        maxTokens: input.maxTokens ?? DEFAULT_CHAT_MAX_TOKENS,
        temperature: input.temperature,
        jsonObject: input.jsonMode,
        sessionId: input.sessionId,
        timeoutMs: input.timeoutMs,
      });
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
