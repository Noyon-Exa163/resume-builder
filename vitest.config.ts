import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    // Reuses one jsdom/worker across files instead of spawning one per
    // file (~5.5s -> ~2s locally). Caveat: each file's module graph is then
    // evaluated once per worker and reused, not fresh per file — a module
    // with shared mutable top-level state (e.g. a cached singleton, like
    // the dbPromise in lib/storage/*/db.ts) could leak between test files
    // sharing a worker. None of the current tests hit this; keep it in
    // mind if a future test imports a real (non-mocked) singleton module.
    isolate: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
