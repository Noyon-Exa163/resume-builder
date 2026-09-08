import { describe, expect, it } from "vitest";

import { PROVIDER_MARK_SRC } from "@/lib/ai/providerMarks";
import type { AIProviderId } from "@/lib/ai/types";

const PROVIDER_IDS: AIProviderId[] = [
  "openrouter",
  "gemini",
  "anthropic",
  "deepseek",
  "customOpenAICompatible",
];

describe("provider marks", () => {
  it("maps every provider id to an asset under /assets/ai/", () => {
    for (const id of PROVIDER_IDS) {
      expect(PROVIDER_MARK_SRC[id]).toMatch(/^\/assets\/ai\/.+\.svg$/);
    }
  });
});
