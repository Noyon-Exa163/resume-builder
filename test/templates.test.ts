import { describe, expect, it } from "vitest";

import {
  getTemplate,
  REGISTERED_TEMPLATE_IDS,
  resolveTemplateId,
  templateRegistry,
} from "@/templates";
import { layout as cyanLayout } from "@/templates/cyan/tokens";
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT_COLOR,
  resolveAccent,
} from "@/templates/cyan/accents";
import { gilroy, layout as exabytingLayout } from "@/templates/exabyting/tokens";
import { layout as minimalLayout } from "@/templates/minimal/tokens";
import type { TemplateMeta } from "@/templates/types";

describe("template registry", () => {
  it("returns the exabyting module for getTemplate('exabyting')", () => {
    const template = getTemplate("exabyting");
    expect(template).toBe(templateRegistry.exabyting);
    expect(template.meta.id).toBe("exabyting");
    expect(template.Document).toBeTypeOf("function");
  });

  it("returns the minimal module for getTemplate('minimal')", () => {
    const template = getTemplate("minimal");
    expect(template).toBe(templateRegistry.minimal);
    expect(template.meta.id).toBe("minimal");
  });

  it("returns the cyan module for getTemplate('cyan')", () => {
    const template = getTemplate("cyan");
    expect(template).toBe(templateRegistry.cyan);
    expect(template.meta.id).toBe("cyan");
    expect(template.meta.name).toBe("Universal");
    expect(template.Document).toBeTypeOf("function");
  });

  it("falls back to the exabyting default for an unknown id", () => {
    const template = getTemplate("nonexistent-id");
    expect(template).toBe(templateRegistry.exabyting);
    expect(template.meta.id).toBe("exabyting");
  });

  it("keeps registered ids in sync with the registry", () => {
    expect(Object.keys(templateRegistry).sort()).toEqual(
      [...REGISTERED_TEMPLATE_IDS].sort(),
    );
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
    expect(meta.name).toBe("Default");
    expect(meta.pageSize).toBe("A4");
  });
});

describe("resolveTemplateId", () => {
  it("returns a registered id unchanged", () => {
    expect(resolveTemplateId("minimal")).toBe("minimal");
    expect(resolveTemplateId("exabyting")).toBe("exabyting");
    expect(resolveTemplateId("cyan")).toBe("cyan");
  });

  it("falls back for a missing or unknown id", () => {
    expect(resolveTemplateId(undefined)).toBe("exabyting");
    expect(resolveTemplateId("nope")).toBe("exabyting");
  });
});

describe("exabyting header layout", () => {
  it("reserves a logo column equal to the mark plus its padding", () => {
    expect(exabytingLayout.logoColumnWidth).toBe(
      exabytingLayout.logoWidth + exabytingLayout.logoContainerPadX * 2,
    );
  });

  it("defines a list-entry timeline rail for the default theme", () => {
    expect(exabytingLayout.timelineRailWidth).toBeGreaterThan(
      exabytingLayout.timelineDotSize,
    );
    expect(exabytingLayout.timelineLineWidth).toBe(1);
    expect(exabytingLayout.timelineBulletSize).toBeLessThan(
      exabytingLayout.timelineDotSize,
    );
    expect("timelineRailWidth" in minimalLayout).toBe(false);
  });

  it("keeps Gilroy-Bold metrics used to sit timeline discs on the title cap-center", () => {
    expect(gilroy.unitsPerEm).toBe(1000);
    expect(gilroy.ascent).toBe(773);
    expect(gilroy.capHeight).toBe(700);
    const capCenterY = ((gilroy.ascent - gilroy.capHeight / 2) / gilroy.unitsPerEm) * 9;
    expect(capCenterY).toBeCloseTo(3.807, 3);
  });
});

describe("minimal header layout", () => {
  it("keeps the logo mark size without a side column", () => {
    expect("logoColumnWidth" in minimalLayout).toBe(false);
    expect(minimalLayout.logoWidth).toBe(60);
    expect(minimalLayout.logoHeight).toBe(32);
  });

  it("keeps the section rule shorter than half the content width", () => {
    const contentWidth = 595.28 - minimalLayout.pagePaddingX * 2;
    expect(minimalLayout.sectionRuleWidth).toBeLessThan(contentWidth / 2);
  });
});

describe("cyan header layout", () => {
  it("does not reserve a company logo column", () => {
    expect("logoColumnWidth" in cyanLayout).toBe(false);
    expect("logoWidth" in cyanLayout).toBe(false);
  });

  it("defines a list-entry timeline rail like the default theme", () => {
    expect(cyanLayout.timelineRailWidth).toBeGreaterThan(
      cyanLayout.timelineDotSize,
    );
    expect(cyanLayout.timelineLineWidth).toBe(1);
    expect(cyanLayout.timelineBulletSize).toBeLessThan(
      cyanLayout.timelineDotSize,
    );
  });
});

describe("universal accent presets", () => {
  it("defaults to cyan and keeps a spectral swatch order", () => {
    expect(DEFAULT_ACCENT_COLOR).toBe("cyan");
    expect(ACCENT_PRESETS.map((preset) => preset.id)).toEqual([
      "blue",
      "indigo",
      "cyan",
      "green",
      "orange",
      "pink",
      "black",
    ]);
    expect(resolveAccent(undefined).id).toBe("cyan");
    expect(resolveAccent("green").brand).toBe("#00c950");
    expect(resolveAccent("pink").brand).toBe("#e2136e");
    expect(resolveAccent("yellow").id).toBe("black");
  });

  it("gives every accent a step-3 preview background", () => {
    expect(resolveAccent("blue").previewBg).toBe("#acccff");
    expect(resolveAccent("pink").previewBg).toBe("#ff9dc8");
    expect(resolveAccent("black").previewBg).toBe("#d6dbe3");
  });
});
