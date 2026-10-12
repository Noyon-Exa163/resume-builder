import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "@/lib/ai/http";
import { runEditChat, runQaChat } from "@/lib/ai/chatRouting";
import { estimateImportCostUsd } from "@/lib/ai/chatModelPricing";
import {
  CHAT_MODEL_OPTIONS,
  chatModelIdsFor,
  DEFAULT_CHAT_MODEL_ID,
  isChatModelId,
  resolveDefaultChatModelId,
} from "@/lib/ai/chatModels";
import { openrouterProvider } from "@/lib/ai/providers/openrouter";
import type { AIChatInput, AIProvider } from "@/lib/ai/types";

afterEach(() => vi.unstubAllGlobals());

/** Headers arrive at once, the body never does — how a slow model looks. */
function stalledBodyFetch() {
  return vi.fn((_url: string, init: RequestInit) => {
    const body = new ReadableStream({
      start(controller) {
        init.signal?.addEventListener("abort", () =>
          controller.error(new DOMException("Aborted", "AbortError")),
        );
      },
    });
    return Promise.resolve(new Response(body, { status: 200 }));
  });
}

describe("fetchWithTimeout", () => {
  it("times out a response whose body stalls after the headers", async () => {
    vi.stubGlobal("fetch", stalledBodyFetch());
    await expect(fetchWithTimeout("https://ai.test", {}, 20)).rejects.toThrow(
      /took too long/,
    );
  });

  it("returns the buffered body and status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 201 })),
    );
    const response = await fetchWithTimeout("https://ai.test", {});
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
  });
});

function completion(content: string): Response {
  return new Response(
    JSON.stringify({ model: "m", choices: [{ message: { content } }] }),
  );
}

describe("OpenRouter reasoning hint", () => {
  const input: AIChatInput = { messages: [{ role: "user", content: "Hi" }] };

  it("asks for minimal reasoning", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion("ok"));
    vi.stubGlobal("fetch", fetchMock);
    await openrouterProvider.chat(input, "key", "some/model");
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.reasoning).toEqual({ effort: "minimal" });
  });

  it("retries without the hint when a model rejects it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 400 }))
      .mockResolvedValueOnce(completion("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await openrouterProvider.chat(input, "key", "some/model");
    expect(result.content).toBe("ok");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).reasoning).toBeUndefined();
  });
});

describe("chat model routing", () => {
  const input: AIChatInput = { messages: [{ role: "user", content: "Hi" }] };

  function fakeProvider(chat: AIProvider["chat"]): AIProvider {
    return {
      id: "openrouter",
      chat,
      extractResumeData: vi.fn(),
      testConnection: vi.fn(),
    };
  }

  it("uses the model picked in the chat box over the admin default", async () => {
    const chat = vi.fn().mockResolvedValue({ content: "{}" });
    await runEditChat(fakeProvider(chat), { apiKey: "k" }, input, {
      pickedModel: "openai/gpt-6-sol",
      defaultModel: "openai/gpt-6-luna",
    });
    expect(chat.mock.calls[0][2]).toBe("openai/gpt-6-sol");
  });

  it("uses the admin's default model when nothing is picked", async () => {
    const chat = vi.fn().mockResolvedValue({ content: "{}" });
    await runEditChat(fakeProvider(chat), { apiKey: "k" }, input, {
      defaultModel: "openai/gpt-6-luna",
    });
    expect(chat.mock.calls[0][2]).toBe("openai/gpt-6-luna");
  });

  it("defaults to the built-in model, never the bare auto-router", async () => {
    const chat = vi.fn().mockResolvedValue({ content: "{}" });
    await runEditChat(fakeProvider(chat), { apiKey: "k" }, input);
    expect(chat.mock.calls[0][2]).toBe(DEFAULT_CHAT_MODEL_ID);
  });

  it("ignores a saved default that is no longer on the list", () => {
    expect(resolveDefaultChatModelId("retired/model")).toBe(
      DEFAULT_CHAT_MODEL_ID,
    );
    expect(resolveDefaultChatModelId("openai/gpt-6-sol")).toBe(
      "openai/gpt-6-sol",
    );
  });

  it("falls back to the auto-router if the chosen model fails", async () => {
    const chat = vi
      .fn()
      .mockRejectedValueOnce(new Error("No such model"))
      .mockResolvedValueOnce({ content: "{}" });
    await runEditChat(fakeProvider(chat), { apiKey: "k" }, input);
    expect(chat.mock.calls[1][2]).toBe("openrouter/auto");
  });

  it("ignores a picked model on providers with a single model", async () => {
    const chat = vi.fn().mockResolvedValue({ content: "{}" });
    const provider = { ...fakeProvider(chat), id: "gemini" as const };
    const config = { apiKey: "k", model: "gemini-model" };
    await runEditChat(provider, config, input, {
      pickedModel: "openai/gpt-6-sol",
    });
    expect(chat).toHaveBeenCalledTimes(1);
    expect(chat.mock.calls[0][2]).toBe("gemini-model");
  });

  it("only offers a model choice on OpenRouter", () => {
    expect(chatModelIdsFor("openrouter")[0]).toBe(DEFAULT_CHAT_MODEL_ID);
    expect(chatModelIdsFor("anthropic")).toEqual([]);
    expect(isChatModelId("openrouter/auto")).toBe(false);
  });

  it("shares one time budget across the free router and its fallback", async () => {
    const chat = vi
      .fn()
      .mockRejectedValueOnce(new Error("Free tier throttled"))
      .mockResolvedValueOnce({ content: "{}" });
    await runQaChat(fakeProvider(chat), { apiKey: "k" }, {
      ...input,
      timeoutMs: 40_000,
    });
    const [first, second] = chat.mock.calls.map((call) => call[0].timeoutMs);
    expect(first).toBeLessThanOrEqual(15_000);
    expect(second).toBeLessThanOrEqual(40_000);
  });
});

describe("import cost estimate", () => {
  const sol = CHAT_MODEL_OPTIONS.find((o) => o.id === "openai/gpt-6-sol")!;
  const haiku = CHAT_MODEL_OPTIONS.find((o) => o.id === DEFAULT_CHAT_MODEL_ID)!;

  it("prices an import from live per-token prices", () => {
    const cost = estimateImportCostUsd(haiku, {
      prompt: "0.0000001",
      completion: "0.0000005",
    });
    expect(cost).toBeCloseTo(0.003, 3);
  });

  it("uses the cache-write rate where the model bills it", () => {
    const pricing = {
      prompt: "0.000002",
      completion: "0.00001",
      input_cache_write: "0.0000025",
    };
    expect(estimateImportCostUsd(sol, pricing)).toBeCloseTo(0.0348, 3);
  });

  it("follows a price change", () => {
    const cost = estimateImportCostUsd(haiku, {
      prompt: "0.0000002",
      completion: "0.000001",
    });
    expect(cost).toBeCloseTo(0.006, 3);
  });

  it("falls back to the measured figure without usable prices", () => {
    expect(estimateImportCostUsd(sol, undefined)).toBe(0.0348);
    expect(estimateImportCostUsd(sol, { prompt: "-1", completion: "x" })).toBe(
      0.0348,
    );
  });
});
