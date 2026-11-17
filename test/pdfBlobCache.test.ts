import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPdfBlobCacheForTests,
  getCachedPdfBlob,
} from "@/lib/export/toPdfBlob";

beforeEach(() => {
  clearPdfBlobCacheForTests();
});

describe("getCachedPdfBlob", () => {
  it("renders once for repeated requests of the same key", async () => {
    const render = vi.fn(async () => new Blob(["a"]));
    await getCachedPdfBlob("hit", render);
    await getCachedPdfBlob("hit", render);
    await getCachedPdfBlob("hit", render);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed render", async () => {
    let attempts = 0;
    const render = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("transient");
      return new Blob(["ok"]);
    });

    await expect(getCachedPdfBlob("reject", render)).rejects.toThrow("transient");
    // The second attempt must re-render, not replay the rejected promise.
    const blob = await getCachedPdfBlob("reject", render);
    expect(await blob.text()).toBe("ok");
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("evicts the least recently used entry beyond the cache limit", async () => {
    const keyA = "lru-a";
    const keyB = "lru-b";
    const keyC = "lru-c";
    const keyD = "lru-d";
    const keyE = "lru-e";

    const calls = new Map<string, number>();
    const rendererFor = (key: string) => async () => {
      calls.set(key, (calls.get(key) ?? 0) + 1);
      return new Blob([key]);
    };

    for (const key of [keyA, keyB, keyC, keyD]) {
      await getCachedPdfBlob(key, rendererFor(key));
    }
    // Touch keyA so keyB becomes the least recently used…
    await getCachedPdfBlob(keyA, rendererFor(keyA));
    // …then push the cache past its limit — exactly one entry (keyB) is
    // evicted. Proving that costs a re-render, whose insertion in turn
    // evicts keyC — so keyC is not probed again after this point.
    await getCachedPdfBlob(keyE, rendererFor(keyE));
    await getCachedPdfBlob(keyB, rendererFor(keyB));
    expect(calls.get(keyB)).toBe(2);

    // Everything still cached must be served without re-rendering: keyA
    // survived thanks to the recency touch; keyD and keyE are recent.
    await getCachedPdfBlob(keyA, rendererFor(keyA));
    await getCachedPdfBlob(keyD, rendererFor(keyD));
    await getCachedPdfBlob(keyE, rendererFor(keyE));
    expect(calls.get(keyA)).toBe(1);
    expect(calls.get(keyD)).toBe(1);
    expect(calls.get(keyE)).toBe(1);
  });
});
