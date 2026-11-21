import { describe, expect, it, vi } from "vitest";
import {
  findFieldByText,
  makeFieldUpdater,
  type EditorStoreActions,
} from "@/lib/editor/fieldMatch";
import { createBlankResume, normalizeAndValidate } from "@/lib/schema/normalize";
import type { ResumeData } from "@/lib/schema/resume";

function buildResume(): ResumeData {
  return normalizeAndValidate({
    personalInfo: {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+880 1711 000000",
      location: "Dhaka, Bangladesh",
      website: "https://example.com",
    },
    summary: "Analytical engineer with a decade of experience.",
    sections: [
      {
        id: "s1",
        kind: "experience",
        title: "Experience",
        entries: [
          {
            id: "e1",
            title: "Senior Engineer",
            subtitle: "Platforms",
            organization: "Exabyting",
            location: "Remote",
            // Stored canonically — the template prints these as
            // "Jan 2020 – Dec 2024" via formatDateRange.
            startDate: "2020-01",
            endDate: "2024-12",
            bullets: [
              "Led the platform team.",
              "Shipped the export pipeline end to end.",
              "Mentored interns.",
            ],
            tags: ["TypeScript", "React"],
          },
          {
            // Shares its start date with the previous entry's end date —
            // the printed "Dec 2024" then belongs to two fields at once.
            id: "e1b",
            title: "Engineer II",
            startDate: "2024-12",
            bullets: ["Kept the lights on."],
          },
          {
            // A current role: no stored end date, the template prints
            // "Aug 2025 - Present" and the end date is the synthetic
            // "Present" value.
            id: "e1c",
            title: "Lead Engineer",
            startDate: "2025-08",
            isCurrent: true,
            bullets: [],
            tags: [],
          },
          {
            // Year-only precision — prints as "2018 – 2022".
            id: "e1d",
            title: "Analyst",
            startDate: "2018",
            endDate: "2022",
            bullets: [],
            tags: [],
          },
        ],
      },
      {
        id: "s2",
        kind: "custom",
        title: "References",
        entries: [{ id: "e2", title: "Jane Referee", bullets: [], tags: [] }],
      },
      {
        id: "s3",
        kind: "skills",
        title: "Core Skills",
        layout: "tags",
        entries: [
          { id: "e3", title: "Languages", tags: ["JavaScript", "AI"] },
        ],
      },
    ],
  });
}

function mockActions(): EditorStoreActions {
  return {
    setPersonalInfo: vi.fn(),
    setSummary: vi.fn(),
    updateSection: vi.fn(),
    updateEntry: vi.fn(),
  };
}

describe("findFieldByText", () => {
  const data = buildResume();

  it("matches a value exactly", () => {
    const field = findFieldByText(data, "ada@example.com");
    expect(field?.field).toBe("personalInfo.email");
  });

  it("matches case-insensitively — templates print transformed text", () => {
    // Default nameCasing is "uppercase", so the PDF text layer holds the
    // uppercased name while the stored value keeps its original casing.
    const field = findFieldByText(data, "ADA LOVELACE");
    expect(field?.field).toBe("personalInfo.fullName");
  });

  it("matches reformatted phones by digit sequence", () => {
    // The template reformats stored phones for print (+880 prefix, new
    // spacing) — the printed text never string-matches the stored value.
    const field = findFieldByText(data, "+880 1711 000000");
    expect(field?.field).toBe("personalInfo.phone");
  });

  it("matches phones when the print format differs from storage entirely", () => {
    // Stored "+880 1711 000000", printed with different spacing/punctuation.
    const field = findFieldByText(data, "+880 · 1711 · 000000");
    expect(field?.field).toBe("personalInfo.phone");
  });

  it("does not digit-match short digit runs like years", () => {
    // A bare year is below the phone-like digit threshold — it can still
    // string-match a date field that prints it ("Dec 2024"), but it must
    // never digit-match an unrelated phone.
    const field = findFieldByText(data, "2024");
    expect(field?.field).toBe("sections[0].entries[0].endDate");
  });

  it("matches a wrapped bullet from one of its lines", () => {
    const field = findFieldByText(data, "Shipped the export pipeline");
    expect(field?.field).toBe("sections[0].entries[0].bullets[1]");
  });

  it("matches when the click spans neighbouring text", () => {
    const field = findFieldByText(data, "Email ada@example.com work");
    expect(field?.field).toBe("personalInfo.email");
  });

  it("matches section titles and tags", () => {
    expect(findFieldByText(data, "References")?.field).toBe(
      "sections[1].title",
    );
    expect(findFieldByText(data, "React")?.field).toBe(
      "sections[0].entries[0].tags[1]",
    );
  });

  it("matches letter-spaced section titles", () => {
    // The template prints section titles uppercase with heavy letter
    // spacing; the PDF text layer arrives as "C O R E S K I L L S".
    const field = findFieldByText(data, "C O R E S K I L L S");
    expect(field?.field).toBe("sections[2].title");
  });

  it("prefers the section title over a same-named entry when letter-spaced", () => {
    // The Languages section contains an entry also titled "Languages" —
    // the spaced heading click belongs to the SECTION title.
    const field = findFieldByText(data, "C O R E S K I L L S");
    expect(field?.field).toBe("sections[2].title");
    const spaced = findFieldByText(data, "E X P E R I E N C E");
    expect(spaced?.field).toBe("sections[0].title");
  });

  it("keeps plain-text clicks on entry titles exact", () => {
    const field = findFieldByText(data, "Languages");
    expect(field?.field).toBe("sections[2].entries[0].title");
  });

  it("does not let short values hijack longer clicked text", () => {
    // The "AI" tag is contained in "Email" — but clicking the word Email
    // must not open a two-letter tag's editor.
    expect(findFieldByText(data, "Email")).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(findFieldByText(data, "completely unrelated text")).toBeNull();
  });

  it("prefers the longest field when a line contains several values", () => {
    // Fallback path: a joined contact line contains both the email and the
    // phone — the longest (most specific) match must win over field order.
    const field = findFieldByText(
      data,
      "ada@example.com · +880 1711 000000",
    );
    expect(field?.field).toBe("personalInfo.phone");
  });

  it("matches printed dates against canonically stored values", () => {
    // Stored "2024-12" prints as "Dec 2024" — string matching can't find
    // it; the date parser must.
    const field = findFieldByText(data, "Dec 2024");
    expect(field?.field).toBe("sections[0].entries[0].endDate");
  });

  it("opens the start date when a printed range is clicked", () => {
    // formatDateRange output: stored start prints as the range's first half.
    const field = findFieldByText(data, "Jan 2020 – Dec 2024");
    expect(field?.field).toBe("sections[0].entries[0].startDate");
  });

  it("falls back to the end date when only it matches the clicked range", () => {
    const field = findFieldByText(data, "Mar 2019 – Dec 2024");
    expect(field?.field).toBe("sections[0].entries[0].endDate");
  });

  it("uses the click position to pick start vs end within a range", () => {
    const left = findFieldByText(data, "Jan 2020 – Dec 2024", 0.2);
    expect(left?.field).toBe("sections[0].entries[0].startDate");
    const right = findFieldByText(data, "Jan 2020 – Dec 2024", 0.8);
    expect(right?.field).toBe("sections[0].entries[0].endDate");
  });

  it("keeps a shared boundary date in the range that was clicked", () => {
    // One entry's end date can be the next entry's start date — aiming at
    // the RIGHT half of the earlier range must open that entry's END, not
    // the later entry's START, even though both hold "Dec 2024".
    const field = findFieldByText(data, "Jan 2020 – Dec 2024", 0.8);
    expect(field?.field).toBe("sections[0].entries[0].endDate");
  });

  it("opens the end date when aiming at a non-parseable end like Present", () => {
    // "Present" isn't a stored field — aiming at it opens the end date
    // rather than falling back to the start date.
    const field = findFieldByText(data, "Jan 2020 – Present", 0.9);
    expect(field?.field).toBe("sections[0].entries[0].endDate");
  });

  it("opens the start date when aiming at the start of a Present range", () => {
    // Aiming at "Jan 2020" in "Jan 2020 – Present" opens the start date,
    // not the end date.
    const field = findFieldByText(data, "Jan 2020 – Present", 0.2);
    expect(field?.field).toBe("sections[0].entries[0].startDate");
  });

  it("keeps a Present-valued range clickable per half", () => {
    // When the end date itself holds "Present" (an isCurrent entry), the
    // reverse-contains fallback used to claim the whole range click for it
    // — clicking "Aug 2025" opened the end date. Both halves must resolve
    // through the date logic instead.
    const start = findFieldByText(data, "Aug 2025 - Present", 0.2);
    expect(start?.field).toBe("sections[0].entries[2].startDate");
    const end = findFieldByText(data, "Aug 2025 - Present", 0.85);
    expect(end?.field).toBe("sections[0].entries[2].endDate");
    expect(end?.currentValue).toBe("Present");
  });

  it("keeps a year-only range clickable per half", () => {
    // "2018 – 2022": both halves are bare years, so neither is a longer
    // reverse-contains match — the tie used to fall to the first field in
    // declaration order (the start date) no matter which half was clicked.
    const start = findFieldByText(data, "2018 – 2022", 0.15);
    expect(start?.field).toBe("sections[0].entries[3].startDate");
    const end = findFieldByText(data, "2018 – 2022", 0.85);
    expect(end?.field).toBe("sections[0].entries[3].endDate");
    // A hyphenated print ("2018 - 2022") splits the same way.
    const hyphenEnd = findFieldByText(data, "2018 - 2022", 0.85);
    expect(hyphenEnd?.field).toBe("sections[0].entries[3].endDate");
  });
});

describe("makeFieldUpdater", () => {
  const data = buildResume();

  function updaterFor(field: string) {
    const actions = mockActions();
    const editable = findFieldByText(data, field);
    if (!editable) throw new Error(`Fixture has no field matching ${field}`);
    return {
      actions,
      update: makeFieldUpdater(actions, editable, data),
    };
  }

  it("updates personal info via setPersonalInfo", () => {
    const { actions, update } = updaterFor("ada@example.com");
    update("new@example.com");
    expect(actions.setPersonalInfo).toHaveBeenCalledWith({
      email: "new@example.com",
    });
  });

  it("updates the summary via setSummary", () => {
    const { actions, update } = updaterFor(
      "Analytical engineer with a decade of experience.",
    );
    update("New summary");
    expect(actions.setSummary).toHaveBeenCalledWith("New summary");
  });

  it("updates an entry title with the right section and entry ids", () => {
    const { actions, update } = updaterFor("Senior Engineer");
    update("Staff Engineer");
    expect(actions.updateEntry).toHaveBeenCalledWith("s1", "e1", {
      title: "Staff Engineer",
    });
  });

  it("replaces a single bullet without touching its siblings", () => {
    const { actions, update } = updaterFor("Mentored interns.");
    update("Ran the internship program.");
    expect(actions.updateEntry).toHaveBeenCalledWith("s1", "e1", {
      bullets: [
        "Led the platform team.",
        "Shipped the export pipeline end to end.",
        "Ran the internship program.",
      ],
    });
  });

  it("replaces a single tag", () => {
    const { actions, update } = updaterFor("TypeScript");
    update("TypeScript 5");
    expect(actions.updateEntry).toHaveBeenCalledWith("s1", "e1", {
      tags: ["TypeScript 5", "React"],
    });
  });

  it("updates entry scalar fields like dates", () => {
    const { actions, update } = updaterFor("Dec 2024");
    update("Present");
    expect(actions.updateEntry).toHaveBeenCalledWith("s1", "e1", {
      endDate: "Present",
    });
  });

  it("updates a section title via updateSection", () => {
    const { actions, update } = updaterFor("References");
    update("Referees");
    expect(actions.updateSection).toHaveBeenCalledWith("s2", {
      title: "Referees",
    });
  });

  it("does nothing for an out-of-range path", () => {
    const actions = mockActions();
    const update = makeFieldUpdater(
      actions,
      { field: "sections[5].title", currentValue: "x", label: "x" },
      data,
    );
    expect(() => update("y")).not.toThrow();
    expect(actions.updateSection).not.toHaveBeenCalled();
  });

  it("does nothing for a malformed path", () => {
    const actions = mockActions();
    const update = makeFieldUpdater(
      actions,
      { field: "personalInfo", currentValue: "x", label: "x" },
      data,
    );
    expect(() => update("y")).not.toThrow();
    expect(actions.setPersonalInfo).not.toHaveBeenCalled();
  });

  it("round-trips with createBlankResume output", () => {
    // Blank resumes have no matching text, so lookups come back empty —
    // the updater path must simply never throw.
    const blank = createBlankResume();
    expect(findFieldByText(blank, "Anything")).toBeNull();
  });
});
