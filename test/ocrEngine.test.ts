import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";

/**
 * tesseract.js's createWorker() can hang forever instead of rejecting when
 * its language-data fetch fails (a bug in the library — see ocrEngine.ts's
 * comment). These tests guard the two behaviors that fix depends on: a
 * hung creation must eventually reject instead of wedging the caller
 * forever, and — the regression this session actually shipped once — a
 * *successful* creation must not be killed later by a stale timer.
 */

let createWorkerMock: Mock<(...args: unknown[]) => unknown>;

vi.mock("tesseract.js", () => ({
  createWorker: (...args: unknown[]) => createWorkerMock(...args),
  OEM: { LSTM_ONLY: "LSTM_ONLY" },
  PSM: { SPARSE_TEXT: "SPARSE_TEXT" },
}));

function makeWorker() {
  return {
    setParameters: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createOcrWorker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createWorkerMock = vi.fn<(...args: unknown[]) => unknown>();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("resolves normally when creation succeeds quickly", async () => {
    const worker = makeWorker();
    createWorkerMock.mockResolvedValue(worker);
    const { createOcrWorker } = await import("@/lib/import/extractors/ocrEngine");

    const result = await createOcrWorker();

    expect(result).toBe(worker);
    expect(worker.setParameters).toHaveBeenCalledWith({
      tessedit_pageseg_mode: "SPARSE_TEXT",
    });
  });

  it("does not terminate a successfully created worker once its startup timer would have fired", async () => {
    const worker = makeWorker();
    createWorkerMock.mockResolvedValue(worker);
    const { createOcrWorker } = await import("@/lib/import/extractors/ocrEngine");

    await createOcrWorker();
    // The regression this guards: an uncleared timer used to force-
    // terminate the worker 30s after ANY creation, successful or not —
    // including one still legitimately in use for a long OCR job.
    await vi.advanceTimersByTimeAsync(60_000);

    expect(worker.terminate).not.toHaveBeenCalled();
  });

  it("rejects with a clear message instead of hanging forever when creation never settles", async () => {
    createWorkerMock.mockReturnValue(new Promise(() => {})); // never settles
    const { createOcrWorker } = await import("@/lib/import/extractors/ocrEngine");

    const pending = createOcrWorker();
    const assertion = expect(pending).rejects.toThrow(
      "Couldn't load the OCR engine. Check your connection and try again.",
    );
    await vi.advanceTimersByTimeAsync(30_000);

    await assertion;
  });

  it("terminates the worker if the hung creation resolves after the timeout gave up on it", async () => {
    const worker = makeWorker();
    let resolveCreation: (w: unknown) => void = () => {};
    createWorkerMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCreation = resolve;
      }),
    );
    const { createOcrWorker } = await import("@/lib/import/extractors/ocrEngine");

    const pending = createOcrWorker();
    const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;

    resolveCreation(worker);
    await vi.waitFor(() => expect(worker.terminate).toHaveBeenCalled());
  });
});
