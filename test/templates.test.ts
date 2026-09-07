import { describe, expect, it } from "vitest";

import { getTemplate, templateRegistry } from "@/templates";
import type { TemplateMeta } from "@/templates/types";

describe("template registry", () => {
  it("returns the exabyting module for getTemplate('exabyting')", () => {
    const template = getTemplate("exabyting");
    expect(template).toBe(templateRegistry.exabyting);
    expect(template.meta.id).toBe("exabyting");
    expect(template.Document).toBeTypeOf("function");
  });

  it("falls back to the exabyting default for an unknown id", () => {
    const template = getTemplate("nonexistent-id");
    expect(template).toBe(templateRegistry.exabyting);
    expect(template.meta.id).toBe("exabyting");
  });

  it("exposes TemplateMeta fields on the exabyting registry entry", () => {
    const { meta } = templateRegistry.exabyting;
    expect(meta.id).toEqual(expect.any(String));
    expect(meta.name).toEqual(expect.any(String));
    expect(meta.thumbnailSrc).toEqual(expect.any(String));
    expect(["A4", "Letter"]).toContain(meta.pageSize);

    const required: Array<keyof TemplateMeta> = [
      "id",
      "name",
      "pageSize",
      "thumbnailSrc",
    ];
    for (const key of required) {
      expect(meta[key]).toBeTruthy();
    }

    expect(meta.id).toBe("exabyting");
    expect(meta.pageSize).toBe("A4");
  });
});
