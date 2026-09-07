import { formatExtractionPrompt } from "../extractionPrompt";
import { geminiResumeResponseSchema } from "../extractionSchema";
import {
  DEFAULT_CHAT_MAX_TOKENS,
  EXTRACT_MAX_TOKENS,
  TEST_MAX_TOKENS,
  TEST_USER_MESSAGE,
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

const GEMINI_DEFAULT_ROOT = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

function modelPath(model: string): string {
  return model.startsWith("models/") ? model : `models/${model}`;
}

function generateContentUrl(
  model: string,
  apiKey: string,
  baseUrl?: string,
): string {
  const root = (baseUrl ?? GEMINI_DEFAULT_ROOT).replace(/\/+$/, "");
  // Official REST examples pass the key as `?key=` on generateContent.
  // https://ai.google.dev/api/generate-content
  const url = new URL(`${root}/${modelPath(model)}:generateContent`);
  url.searchParams.set("key", apiKey);
  return url.toString();
}

function collectText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text)
    .filter((text): text is string => typeof text === "string")
    .join("");
}

async function generateContent(args: {
  apiKey: string;
  model: string;
  baseUrl?: string;
  userText: string;
  system?: string;
  history?: AIChatInput["messages"];
  jsonMime?: boolean;
  responseSchema?: unknown;
  maxOutputTokens: number;
  temperature?: number;
}): Promise<string> {
  requireApiKey(args.apiKey, "Gemini");

  const contents: Array<{ role: string; parts: GeminiPart[] }> = [];
  if (args.history) {
    for (const message of args.history) {
      contents.push({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      });
    }
  }
  contents.push({ role: "user", parts: [{ text: args.userText }] });

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: args.maxOutputTokens,
  };
  if (args.temperature !== undefined)
    generationConfig.temperature = args.temperature;
  if (args.jsonMime) {
    generationConfig.responseMimeType = "application/json";
  }
  if (args.responseSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = args.responseSchema;
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig,
  };
  if (args.system) {
    body.systemInstruction = { parts: [{ text: args.system }] };
  }

  const response = await fetch(
    generateContentUrl(args.model, args.apiKey, args.baseUrl),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw httpError(
      "Gemini",
      response.status,
      await readErrorMessage(response),
    );
  }

  const data = (await response.json()) as GeminiResponse;
  if (data.promptFeedback?.blockReason) {
    throw new Error(
      `Gemini blocked the prompt (${data.promptFeedback.blockReason}).`,
    );
  }
  return collectText(data);
}

export const geminiProvider: AIProvider = {
  id: "gemini",

  async extractResumeData(
    input: AIExtractResumeInput,
    apiKey: string,
    model: string,
    baseUrl?: string,
  ): Promise<AIExtractResumeResult> {
    const raw = await generateContent({
      apiKey,
      model,
      baseUrl,
      system:
        "You extract structured resume data as JSON. Do not invent facts.",
      userText: formatExtractionPrompt(input),
      jsonMime: true,
      responseSchema: geminiResumeResponseSchema,
      maxOutputTokens: EXTRACT_MAX_TOKENS,
      temperature: 0,
    });
    return { json: parseModelJson(raw), raw };
  },

  async chat(
    input: AIChatInput,
    apiKey: string,
    model: string,
    baseUrl?: string,
  ): Promise<AIChatResult> {
    const history = input.messages.slice(0, -1);
    const last = input.messages[input.messages.length - 1];
    if (!last || last.role !== "user") {
      throw new Error(
        "Gemini chat() expects the last message to be from the user.",
      );
    }

    const content = await generateContent({
      apiKey,
      model,
      baseUrl,
      system: input.system,
      history,
      userText: last.content,
      jsonMime: input.jsonMode,
      maxOutputTokens: input.maxTokens ?? DEFAULT_CHAT_MAX_TOKENS,
      temperature: input.temperature,
    });
    return { content };
  },

  async testConnection(
    apiKey: string,
    model: string,
    baseUrl?: string,
  ): Promise<AIConnectionTestResult> {
    try {
      await generateContent({
        apiKey,
        model,
        baseUrl,
        userText: TEST_USER_MESSAGE,
        maxOutputTokens: TEST_MAX_TOKENS,
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
