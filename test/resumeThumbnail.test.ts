import { describe, expect, it } from "vitest";

import {
  computeThumbnailKey,
  thumbnailCacheId,
} from "@/lib/export/resumeThumbnail";
import { createBlankResume } from "@/lib/schema/normalize";

describe("computeThumbnailKey", () => {
  it("changes when the summary changes", () => {
    const resume = createBlankResume();
    const withSummary = { ...resume, summary: "A short summary." };
    expect(computeThumbnailKey(resume)).not.toBe(
      computeThumbnailKey(withSummary),
    );
  });

  it("does not change when only sections change", () => {
    const resume = createBlankResume();
    const withSection = {
      ...resume,
      sections: [
        ...resume.sections,
        {
          id: "extra-section",
          kind: "experience" as const,
          title: "Experience",
          visible: true,
          layout: "list" as const,
          showSkillIcons: false,
          entries: [
            { id: "e1", title: "New job", bullets: [], tags: [] },
          ],
        },
      ],
    };
    expect(computeThumbnailKey(resume)).toBe(computeThumbnailKey(withSection));
  });

  it("changes when the template changes", () => {
    const resume = createBlankResume("exabyting");
    const minimal = {
      ...resume,
      meta: { ...resume.meta, templateId: "minimal" },
    };
    expect(computeThumbnailKey(resume)).not.toBe(computeThumbnailKey(minimal));
  });

  it("changes when the Universal accent changes", () => {
    const resume = createBlankResume("cyan");
    const green = {
      ...resume,
      meta: { ...resume.meta, accentColor: "green" as const },
    };
    expect(computeThumbnailKey(resume)).not.toBe(computeThumbnailKey(green));
  });
});

describe("thumbnailCacheId", () => {
  it("scopes a resume's cache row to a template", () => {
    expect(thumbnailCacheId("abc", "exabyting")).toBe("abc:exabyting");
    expect(thumbnailCacheId("abc", "minimal")).not.toBe(
      thumbnailCacheId("abc", "exabyting"),
    );
  });
});
