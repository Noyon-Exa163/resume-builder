import { afterEach, describe, expect, it, vi } from "vitest";
import { sendChatMessage } from "@/lib/import/aiChat";
import type { ResumeData } from "@/lib/schema/resume";

const baseArgs = {
  resume: {} as ResumeData,
  history: [],
  message: "Hi",
};

/** A streamed response whose chunks split lines at awkward places. */
function streamOf(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { status },
  );
}

function mockFetch(response: Response) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

afterEach(() => vi.unstubAllGlobals());

describe("sendChatMessage streaming", () => {
  it("reports stages as they arrive and returns the result", async () => {
    mockFetch(
      streamOf([
        '{"type":"stage","stage":"writing"}\n{"type":"sta',
        'ge","stage":"checking"}\n{"type":"result","reply":"Done","model":"m"}\n',
      ]),
    );
    const stages: string[] = [];
    const result = await sendChatMessage({
      ...baseArgs,
      onStage: (stage) => stages.push(stage),
    });
    expect(stages).toEqual(["writing", "checking"]);
    expect(result).toMatchObject({ reply: "Done", model: "m" });
  });

  it("throws the server's error message", async () => {
    mockFetch(streamOf(['{"type":"error","error":"Provider said no."}\n']));
    await expect(sendChatMessage(baseArgs)).rejects.toThrow("Provider said no.");
  });

  it("explains a stream that ends without a result", async () => {
    mockFetch(streamOf(['{"type":"stage","stage":"writing"}\n']));
    await expect(sendChatMessage(baseArgs)).rejects.toThrow(/too long/);
  });

  it("explains a connection dropped mid-stream instead of a bare network error", async () => {
    const encoder = new TextEncoder();
    let pulls = 0;
    mockFetch(
      new Response(
        new ReadableStream({
          pull(controller) {
            pulls += 1;
            if (pulls === 1) {
              controller.enqueue(encoder.encode('{"type":"stage","stage":"writing"}\n'));
            } else {
              controller.error(new TypeError("network error"));
            }
          },
        }),
      ),
    );
    await expect(sendChatMessage(baseArgs)).rejects.toThrow(/too long/);
  });

  it("still maps plain HTTP failures", async () => {
    mockFetch(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }));
    await expect(sendChatMessage(baseArgs)).rejects.toThrow("Unauthorized");
  });
});
