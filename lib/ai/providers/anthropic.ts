import { formatExtractionPrompt } from "../extractionPrompt";
import { anthropicResumeInputSchema } from "../extractionSchema";
import {
  DEFAULT_CHAT_MAX_TOKENS,
  EXTRACT_MAX_TOKENS,
  TEST_MAX_TOKENS,
  TEST_USER_MESSAGE,
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
} from "../types";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
/** Current required version header in Anthropic's Messages API examples. */
const ANTHROPIC_VERSION = "2023-06-01";
const EMIT_RESUME_TOOL = "emit_resume_json";

function messagesUrl(baseUrl?: string): string {
  if (!baseUrl?.trim()) return ANTHROPIC_MESSAGES_URL;
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/messages")) return trimmed;
  // Assumption: a custom host is an API origin; append the documented path.
  return `${trimmed}/v1/messages`;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
}

interface AnthropicMessageResponse {
  content?: AnthropicContentBlock[];
  model?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
}

function totalTokensFromUsage(
  usage: AnthropicMessageResponse["usage"],
): number | undefined {
  if (
    typeof usage?.input_tokens !== "number" ||
    typeof usage?.output_tokens !== "number"
  ) {
    return undefined;
  }
  return usage.input_tokens + usage.output_tokens;
}

async function postMessages(args: {
  apiKey: string;
  model: string;
  maxTokens: number;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  system?: string;
  temperature?: number;
  tools?: unknown[];
  toolChoice?: unknown;
  baseUrl?: string;
  timeoutMs?: number;
}): Promise<AnthropicMessageResponse> {
  requireApiKey(args.apiKey, "Anthropic");

  const body: Record<string, unknown> = {
    model: args.model,
    max_tokens: args.maxTokens,
    messages: args.messages,
  };
  if (args.system) body.system = args.system;
  if (args.temperature !== undefined) body.temperature = args.temperature;
  if (args.tools) body.tools = args.tools;
  if (args.toolChoice) body.tool_choice = args.toolChoice;

  const response = await fetchWithTimeout(
    messagesUrl(args.baseUrl),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": args.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    },
    args.timeoutMs,
  );

  if (!response.ok) {
    throw httpError(
      "Anthropic",
      response.status,
      await readErrorMessage(response),
    );
  }

  return (await response.json()) as AnthropicMessageResponse;
}

function textFromBlocks(blocks: AnthropicContentBlock[] | undefined): string {
  if (!blocks) return "";
  return blocks
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n");
}

export const anthropicProvider: AIProvider = {
  id: "anthropic",

  async extractResumeData(
    input: AIExtractResumeInput,
    apiKey: string,
    model: string,
    baseUrl?: string,
  ): Promise<AIExtractResumeResult> {
    const data = await postMessages({
      apiKey,
      model,
      baseUrl,
      maxTokens: EXTRACT_MAX_TOKENS,
      temperature: 0,
      system:
        "You extract structured resume data. Call the emit_resume_json tool with the extracted fields. Do not invent facts.",
      messages: [{ role: "user", content: formatExtractionPrompt(input) }],
      tools: [
        {
          name: EMIT_RESUME_TOOL,
          description:
            "Emit the extracted resume as structured JSON matching the ResumeData shape.",
          input_schema: anthropicResumeInputSchema,
        },
      ],
      // Forced tool use — Anthropic's documented structured-output path.
      toolChoice: {
        type: "tool",
        name: EMIT_RESUME_TOOL,
        disable_parallel_tool_use: true,
      },
    });

    const toolBlock = data.content?.find(
      (block) => block.type === "tool_use" && block.name === EMIT_RESUME_TOOL,
    );
    if (toolBlock && toolBlock.input !== undefined) {
      return {
        json: toolBlock.input,
        raw: JSON.stringify(toolBlock.input),
      };
    }

    const raw = textFromBlocks(data.content);
    return { json: parseModelJson(raw), raw };
  },

  async chat(
    input: AIChatInput,
    apiKey: string,
    model: string,
    baseUrl?: string,
  ): Promise<AIChatResult> {
    let system = input.system;
    if (input.jsonMode) {
      // Anthropic Messages API has no `response_format: json_object`. Extract
      // uses a forced tool; chat() asks for JSON in the system prompt instead.
      const jsonInstruction = "Respond with a JSON object only — no markdown.";
      system = system ? `${system}\n\n${jsonInstruction}` : jsonInstruction;
    }

    const data = await postMessages({
      apiKey,
      model,
      baseUrl,
      maxTokens: input.maxTokens ?? DEFAULT_CHAT_MAX_TOKENS,
      temperature: input.temperature,
      timeoutMs: input.timeoutMs,
      system,
      messages: input.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    return {
      content: textFromBlocks(data.content),
      model: data.model,
      totalTokens: totalTokensFromUsage(data.usage),
    };
  },

  async testConnection(
    apiKey: string,
    model: string,
    baseUrl?: string,
  ): Promise<AIConnectionTestResult> {
    try {
      await postMessages({
        apiKey,
        model,
        baseUrl,
        maxTokens: TEST_MAX_TOKENS,
        messages: [{ role: "user", content: TEST_USER_MESSAGE }],
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
