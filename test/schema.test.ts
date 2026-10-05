import { describe, expect, it } from "vitest";

import {
  backfillMetaDefaults,
  createBlankResume,
  dedupeResumeIds,
  normalizeAndValidate,
} from "@/lib/schema/normalize";
import {
  CURRENT_SCHEMA_VERSION,
  EntrySchema,
  PersonalInfoSchema,
  ResumeDataSchema,
  SectionSchema,
  isReferencesSectionTitle,
  sectionUsesGrid,
  type ResumeData,
} from "@/lib/schema/resume";

function expectParseFail(
  schema: { safeParse: (value: unknown) => { success: boolean } },
  value: unknown,
) {
  expect(schema.safeParse(value).success).toBe(false);
}

const ISO = "2026-01-15T12:00:00.000Z";

function validResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta: {
      id: "resume-1",
      title: "Ada Lovelace",
      createdAt: ISO,
      updatedAt: ISO,
      templateId: "exabyting",
      pageSize: "A4",
      nameCasing: "uppercase",
      accentColor: "cyan",
      alternatePhoneVisible: true,
    },
    personalInfo: { fullName: "Ada Lovelace" },
    sections: [],
    ...overrides,
  };
}

describe("EntrySchema", () => {
  it("applies defaults for title, bullets, and tags", () => {
    const entry = EntrySchema.parse({ id: "e1" });
    expect(entry).toMatchObject({
      id: "e1",
      title: "",
      bullets: [],
      tags: [],
    });
  });

  it("fails when the required id is missing", () => {
    expectParseFail(EntrySchema, { title: "Engineer" });
  });

  it("accepts a url, an empty string, or a missing link", () => {
    expect(
      EntrySchema.parse({ id: "e1", link: "https://example.com" }).link,
    ).toBe("https://example.com");
    expect(EntrySchema.parse({ id: "e1", link: "" }).link).toBe("");
    expect(EntrySchema.parse({ id: "e1" }).link).toBeUndefined();
  });

  it("keeps a half-typed link so an in-progress draft stays saveable", () => {
    expect(EntrySchema.parse({ id: "e1", link: "example.c" }).link).toBe(
      "example.c",
    );
  });
});

describe("SectionSchema", () => {
  it("applies defaults for visible, layout, and entries", () => {
    const section = SectionSchema.parse({
      id: "s1",
      kind: "experience",
      title: "Experience",
    });
    expect(section).toMatchObject({
      visible: true,
      layout: "list",
      entries: [],
    });
  });

  it("fails when required id, kind, or title is missing", () => {
    expectParseFail(SectionSchema, {
      kind: "experience",
      title: "Experience",
    });
    expectParseFail(SectionSchema, { id: "s1", title: "Experience" });
    expectParseFail(SectionSchema, { id: "s1", kind: "experience" });
  });

  it("rejects an unknown kind or layout", () => {
    expectParseFail(SectionSchema, {
      id: "s1",
      kind: "hobby",
      title: "Hobbies",
    });
    expectParseFail(SectionSchema, {
      id: "s1",
      kind: "experience",
      title: "Experience",
      layout: "columns",
    });
  });
});

describe("PersonalInfoSchema", () => {
  it("defaults fullName to an empty string", () => {
    expect(PersonalInfoSchema.parse({}).fullName).toBe("");
  });

  it("accepts an email, an empty string, or a missing email", () => {
    expect(PersonalInfoSchema.parse({ email: "ada@example.com" }).email).toBe(
      "ada@example.com",
    );
    expect(PersonalInfoSchema.parse({ email: "" }).email).toBe("");
    expect(PersonalInfoSchema.parse({}).email).toBeUndefined();
  });

  it("accepts a url, an empty string, or a missing website", () => {
    expect(
      PersonalInfoSchema.parse({ website: "https://ada.dev" }).website,
    ).toBe("https://ada.dev");
    expect(PersonalInfoSchema.parse({ website: "" }).website).toBe("");
    expect(PersonalInfoSchema.parse({}).website).toBeUndefined();
  });

  // The editor autosaves mid-keystroke, so contact fields must survive being
  // half-typed. Format is reported in the form, not enforced on save.
  it("keeps half-typed contact details rather than rejecting the draft", () => {
    expect(PersonalInfoSchema.parse({ email: "ada@" }).email).toBe("ada@");
    expect(PersonalInfoSchema.parse({ website: "ada.d" }).website).toBe(
      "ada.d",
    );
  });
});

describe("ResumeDataSchema", () => {
  it("applies defaults for sections and meta title/template/pageSize", () => {
    const resume = ResumeDataSchema.parse({
      schemaVersion: 1,
      meta: { id: "resume-1", createdAt: ISO, updatedAt: ISO },
      personalInfo: {},
    });
    expect(resume.sections).toEqual([]);
    expect(resume.meta.title).toBe("Untitled Resume");
    expect(resume.meta.templateId).toBe("exabyting");
    expect(resume.meta.pageSize).toBe("A4");
    expect(resume.personalInfo.fullName).toBe("");
  });

  it("maps a stored yellow accent to black", () => {
    const resume = ResumeDataSchema.parse({
      schemaVersion: 1,
      meta: {
        id: "resume-1",
        createdAt: ISO,
        updatedAt: ISO,
        accentColor: "yellow",
      },
      personalInfo: {},
    });
    expect(resume.meta.accentColor).toBe("black");
  });

  it("fails when required fields are missing or illegal", () => {
    expectParseFail(ResumeDataSchema, {
      meta: { id: "resume-1", createdAt: ISO, updatedAt: ISO },
      personalInfo: {},
    });
    expectParseFail(ResumeDataSchema, {
      schemaVersion: 2,
      meta: { id: "resume-1", createdAt: ISO, updatedAt: ISO },
      personalInfo: {},
    });
    expectParseFail(ResumeDataSchema, {
      schemaVersion: 1,
      meta: { createdAt: ISO, updatedAt: ISO },
      personalInfo: {},
    });
    expectParseFail(ResumeDataSchema, {
      schemaVersion: 1,
      meta: { id: "resume-1", createdAt: ISO, updatedAt: ISO },
    });
    expectParseFail(
      ResumeDataSchema,
      validResume({
        meta: {
          ...validResume().meta,
          pageSize: "Legal" as ResumeData["meta"]["pageSize"],
        },
      }),
    );
  });

  it("accepts a fully populated valid resume", () => {
    const parsed = ResumeDataSchema.parse(
      validResume({
        summary: "Mathematician.",
        personalInfo: {
          fullName: "Ada Lovelace",
          email: "ada@example.com",
          website: "https://ada.dev",
        },
        sections: [
          {
            id: "s1",
            kind: "experience",
            title: "Experience",
            visible: true,
            layout: "list",
            showSkillIcons: false,
            entries: [
              {
                id: "e1",
                title: "Analyst",
                bullets: ["Notes on the Analytical Engine"],
                tags: ["math"],
              },
            ],
          },
        ],
      }),
    );
    expect(parsed.summary).toBe("Mathematician.");
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].entries).toHaveLength(1);
  });
});

describe("normalizeAndValidate", () => {
  it("fills ids, defaults, and timestamps from a partial input", () => {
    const resume = normalizeAndValidate({
      personalInfo: { fullName: "Ada Lovelace" },
      summary: "Mathematician.",
      sections: [
        {
          kind: "experience",
          title: "Experience",
          entries: [{ title: "Analyst", bullets: ["Wrote programs"] }],
        },
      ],
    });

    expect(resume.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(resume.meta.id.length).toBeGreaterThan(0);
    expect(resume.meta.title).toBe("Untitled Resume");
    expect(resume.meta.templateId).toBe("exabyting");
    expect(resume.meta.pageSize).toBe("A4");
    expect(resume.meta.nameCasing).toBe("uppercase");
    expect(Number.isNaN(Date.parse(resume.meta.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(resume.meta.updatedAt))).toBe(false);

    expect(resume.personalInfo.fullName).toBe("Ada Lovelace");
    expect(resume.summary).toBe("Mathematician.");
    expect(resume.sections).toHaveLength(1);
    expect(resume.sections[0].id.length).toBeGreaterThan(0);
    expect(resume.sections[0].kind).toBe("experience");
    expect(resume.sections[0].visible).toBe(true);
    expect(resume.sections[0].layout).toBe("list");
    expect(resume.sections[0].entries).toHaveLength(1);
    expect(resume.sections[0].entries[0].id.length).toBeGreaterThan(0);
    expect(resume.sections[0].entries[0].title).toBe("Analyst");
    expect(resume.sections[0].entries[0].bullets).toEqual(["Wrote programs"]);
    expect(resume.sections[0].entries[0].tags).toEqual([]);

    expect(ResumeDataSchema.safeParse(resume).success).toBe(true);
  });

  it("does not throw on contact details that are still being typed", () => {
    const draft = normalizeAndValidate({
      personalInfo: { email: "ada@", website: "ada.d" },
      sections: [
        {
          id: "s1",
          kind: "projects",
          title: "Projects",
          entries: [{ id: "e1", title: "Portfolio", link: "ada.d" }],
        },
      ],
    });

    expect(draft.personalInfo.email).toBe("ada@");
    expect(draft.personalInfo.website).toBe("ada.d");
    expect(draft.sections[0].entries[0].link).toBe("ada.d");
  });
});

describe("createBlankResume", () => {
  it("produces a schema-valid ResumeData", () => {
    const blank = createBlankResume();
    expect(ResumeDataSchema.safeParse(blank).success).toBe(true);
    expect(blank.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(blank.meta.templateId).toBe("exabyting");
    expect(blank.meta.accentColor).toBe("cyan");
    expect(blank.meta.pageSize).toBe("A4");
    expect(blank.meta.title).toBe("Untitled Resume");
    expect(blank.personalInfo.fullName).toBe("");
    expect(blank.sections).toEqual([]);
    expect(blank.meta.id.length).toBeGreaterThan(0);
    expect(blank.meta.createdAt.length).toBeGreaterThan(0);
    expect(blank.meta.updatedAt.length).toBeGreaterThan(0);
  });

  it("stamps a supplied template id onto a blank resume", () => {
    expect(createBlankResume("minimal").meta.templateId).toBe("minimal");
    expect(createBlankResume("cyan").meta.templateId).toBe("cyan");
  });
});

describe("re-normalizing a valid resume", () => {
  it("preserves existing ids rather than regenerating them", () => {
    const original = normalizeAndValidate({
      meta: { id: "keep-resume", title: "Keep Me" },
      personalInfo: { fullName: "Ada Lovelace" },
      sections: [
        {
          id: "keep-section",
          kind: "education",
          title: "Education",
          entries: [{ id: "keep-entry", title: "University" }],
        },
      ],
    });

    const again = normalizeAndValidate(original);

    expect(again.meta.id).toBe("keep-resume");
    expect(again.meta.title).toBe("Keep Me");
    expect(again.sections[0].id).toBe("keep-section");
    expect(again.sections[0].entries[0].id).toBe("keep-entry");
    expect(again.personalInfo.fullName).toBe("Ada Lovelace");
    expect(ResumeDataSchema.safeParse(again).success).toBe(true);
  });

  it("mints a fresh id for a section or entry that reuses another's id", () => {
    const resume = normalizeAndValidate({
      sections: [
        {
          id: "dup-section",
          kind: "experience",
          title: "Experience",
          entries: [
            { id: "dup-entry", title: "Analyst" },
            { id: "dup-entry", title: "Engineer" },
          ],
        },
        {
          id: "dup-section",
          kind: "education",
          title: "Education",
          entries: [],
        },
      ],
    });

    expect(resume.sections[0].id).toBe("dup-section");
    expect(resume.sections[1].id).not.toBe("dup-section");
    expect(resume.sections[0].entries[0].id).toBe("dup-entry");
    expect(resume.sections[0].entries[1].id).not.toBe("dup-entry");
  });
});

describe("dedupeResumeIds", () => {
  it("returns the exact same object when there's nothing to fix", () => {
    const resume = normalizeAndValidate({
      sections: [
        {
          kind: "experience",
          title: "Experience",
          entries: [{ title: "Analyst" }],
        },
      ],
    });

    expect(dedupeResumeIds(resume)).toBe(resume);
  });

  it("reassigns a reused id already sitting in storage, leaving the first occurrence untouched", () => {
    const resume = normalizeAndValidate({
      sections: [{ kind: "skills", title: "Skills", entries: [{ title: "A" }] }],
    });
    const corrupted: typeof resume = {
      ...resume,
      sections: [
        {
          ...resume.sections[0],
          entries: [
            { ...resume.sections[0].entries[0], id: "8Qjndq7fjmAw", title: "Languages" },
            { ...resume.sections[0].entries[0], id: "8Qjndq7fjmAw", title: "Cloud" },
          ],
        },
      ],
    };

    const repaired = dedupeResumeIds(corrupted);

    expect(repaired).not.toBe(corrupted);
    expect(repaired.sections[0].entries[0].id).toBe("8Qjndq7fjmAw");
    expect(repaired.sections[0].entries[1].id).not.toBe("8Qjndq7fjmAw");
    expect(ResumeDataSchema.safeParse(repaired).success).toBe(true);
  });
});

describe("backfillMetaDefaults", () => {
  it("returns the exact same object when nameCasing is already set", () => {
    const resume = normalizeAndValidate({
      personalInfo: { fullName: "Ada Lovelace" },
    });
    expect(backfillMetaDefaults(resume)).toBe(resume);
  });

  it("defaults a resume saved before nameCasing existed to uppercase", () => {
    const resume = normalizeAndValidate({
      personalInfo: { fullName: "Ada Lovelace" },
    });
    // Simulate data written before the field existed: the type says
    // nameCasing can't be undefined, but a legacy DB row's JSON has no such
    // key — this cast mirrors what `found.resume` looks like at runtime.
    const legacy = {
      ...resume,
      meta: { ...resume.meta, nameCasing: undefined as unknown as "uppercase" },
    };

    const repaired = backfillMetaDefaults(legacy);

    expect(repaired).not.toBe(legacy);
    expect(repaired.meta.nameCasing).toBe("uppercase");
  });
});

describe("references layout", () => {
  it("treats reference headings as a two-column grid", () => {
    expect(isReferencesSectionTitle("REFERENCES")).toBe(true);
    expect(isReferencesSectionTitle("Reference")).toBe(true);
    expect(isReferencesSectionTitle("Referees")).toBe(true);
    expect(isReferencesSectionTitle("Publications")).toBe(false);

    expect(sectionUsesGrid({ layout: "list", title: "References" })).toBe(true);
    expect(sectionUsesGrid({ layout: "list", title: "Experience" })).toBe(
      false,
    );
  });

  it("normalizes a References section onto the grid even if it arrived as a list", () => {
    const resume = normalizeAndValidate({
      sections: [
        {
          kind: "custom",
          title: "REFERENCES",
          layout: "list",
          entries: [{ title: "Matiur Rahman" }],
        },
      ],
    });
    expect(resume.sections[0].layout).toBe("grid");
  });
});
