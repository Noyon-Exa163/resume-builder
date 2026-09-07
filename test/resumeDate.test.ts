import { describe, expect, it } from "vitest";
import {
  commitDateInput,
  formatDateRange,
  formatDisplayDate,
  maskDateDigits,
  parseResumeDate,
  toMaskedInput,
  toStorageDate,
} from "@/lib/date";

describe("parseResumeDate", () => {
  it("reads each stored precision", () => {
    expect(parseResumeDate("2016")).toEqual({ year: 2016 });
    expect(parseResumeDate("2020-09")).toEqual({ year: 2020, month: 9 });
    expect(parseResumeDate("2026-09-07")).toEqual({
      year: 2026,
      month: 9,
      day: 7,
    });
  });

  it("reads the ISO timestamps kept on resume metadata", () => {
    expect(parseResumeDate("2026-09-07T10:31:27.248Z")).toEqual({
      year: 2026,
      month: 9,
      day: 7,
    });
  });

  it("reads what the user types and what imports produce", () => {
    expect(parseResumeDate("07/09/2026")).toEqual({
      year: 2026,
      month: 9,
      day: 7,
    });
    expect(parseResumeDate("09/2026")).toEqual({ year: 2026, month: 9 });
    expect(parseResumeDate("Jan 2020")).toEqual({ year: 2020, month: 1 });
    expect(parseResumeDate("September 2020")).toEqual({
      year: 2020,
      month: 9,
    });
  });

  it("round-trips its own display format", () => {
    expect(parseResumeDate("07 Sep 2026")).toEqual({
      year: 2026,
      month: 9,
      day: 7,
    });
  });

  it("rejects impossible and unrecognisable values", () => {
    expect(parseResumeDate("2020-13")).toBeNull();
    expect(parseResumeDate("31/02/2020")).toBeNull();
    expect(parseResumeDate("Summer 2019")).toBeNull();
    expect(parseResumeDate("")).toBeNull();
    expect(parseResumeDate(undefined)).toBeNull();
  });

  it("accepts a leap day only in a leap year", () => {
    expect(parseResumeDate("29/02/2024")).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
    expect(parseResumeDate("29/02/2023")).toBeNull();
  });
});

describe("formatDisplayDate", () => {
  it("shows DD MMM YYYY, dropping the parts that aren't known", () => {
    expect(formatDisplayDate("2026-09-07")).toBe("07 Sep 2026");
    expect(formatDisplayDate("2020-09")).toBe("Sep 2020");
    expect(formatDisplayDate("2016")).toBe("2016");
  });

  it("normalises legacy and imported values", () => {
    expect(formatDisplayDate("Jan 2020")).toBe("Jan 2020");
    expect(formatDisplayDate("09/2026")).toBe("Sep 2026");
    expect(formatDisplayDate("2026-09-07T10:31:27.248Z")).toBe("07 Sep 2026");
  });

  it("passes text it cannot read through untouched", () => {
    expect(formatDisplayDate("  Summer 2019 ")).toBe("Summer 2019");
    expect(formatDisplayDate(undefined)).toBe("");
  });
});

describe("formatDateRange", () => {
  it("joins both ends", () => {
    expect(
      formatDateRange({ startDate: "2020-09", endDate: "2023-04" }),
    ).toBe("Sep 2020 – Apr 2023");
  });

  it("labels an ongoing entry", () => {
    expect(formatDateRange({ startDate: "2020-09", isCurrent: true })).toBe(
      "Sep 2020 – Present",
    );
  });

  it("returns whichever end exists on its own", () => {
    expect(formatDateRange({ startDate: "2016" })).toBe("2016");
    expect(formatDateRange({ endDate: "2016" })).toBe("2016");
    expect(formatDateRange({})).toBe("");
  });
});

describe("toStorageDate", () => {
  it("writes the canonical, sortable form", () => {
    expect(toStorageDate({ year: 2016 })).toBe("2016");
    expect(toStorageDate({ year: 2020, month: 9 })).toBe("2020-09");
    expect(toStorageDate({ year: 2026, month: 9, day: 7 })).toBe("2026-09-07");
  });
});

describe("maskDateDigits", () => {
  it("inserts each slash as the segment before it fills", () => {
    expect(maskDateDigits("0")).toBe("0");
    expect(maskDateDigits("07")).toBe("07/");
    expect(maskDateDigits("070")).toBe("07/0");
    expect(maskDateDigits("0709")).toBe("07/09/");
    expect(maskDateDigits("07092026")).toBe("07/09/2026");
  });

  it("leaves a bare year alone rather than splitting it", () => {
    expect(maskDateDigits("2")).toBe("2");
    expect(maskDateDigits("20")).toBe("20");
    expect(maskDateDigits("2016")).toBe("2016");
    expect(maskDateDigits("1999")).toBe("1999");
  });

  it("lands on MM/YYYY when the second segment can only be a year", () => {
    expect(maskDateDigits("092")).toBe("09/2");
    expect(maskDateDigits("092026")).toBe("09/2026");
    expect(maskDateDigits("121999")).toBe("12/1999");
  });

  it("reflows to a full date once a year-like day is disproved", () => {
    expect(maskDateDigits("1909")).toBe("1909");
    expect(maskDateDigits("19091999")).toBe("19/09/1999");
    expect(maskDateDigits("20092026")).toBe("20/09/2026");
  });

  it("ignores non-digits and stops at eight digits", () => {
    expect(maskDateDigits("07/09/2026")).toBe("07/09/2026");
    expect(maskDateDigits("070920261234")).toBe("07/09/2026");
    expect(maskDateDigits("")).toBe("");
  });
});

describe("toMaskedInput", () => {
  it("shows a stored date back as editable DD/MM/YYYY text", () => {
    expect(toMaskedInput("2026-09-07")).toBe("07/09/2026");
    expect(toMaskedInput("2020-09")).toBe("09/2020");
    expect(toMaskedInput("2016")).toBe("2016");
  });

  it("round-trips half-typed text so the caret can keep moving", () => {
    expect(toMaskedInput("07/")).toBe("07/");
    expect(toMaskedInput("07/09/20")).toBe("07/09/20");
  });
});

describe("commitDateInput", () => {
  it("stores the canonical form once the date is understandable", () => {
    expect(commitDateInput("07/09/2026")).toBe("2026-09-07");
    expect(commitDateInput("09/2026")).toBe("2026-09");
    expect(commitDateInput("2016")).toBe("2016");
  });

  it("keeps a half-typed date exactly as typed", () => {
    expect(commitDateInput("07/")).toBe("07/");
    expect(commitDateInput("07/09/20")).toBe("07/09/20");
    expect(commitDateInput("")).toBe("");
  });

  it("survives typing a full date one keystroke at a time", () => {
    const keystrokes = ["0", "07", "070", "0709", "07092", "070920", "0709202", "07092026"];
    const settled = keystrokes.map((digits) =>
      commitDateInput(maskDateDigits(digits)),
    );
    expect(settled.at(-1)).toBe("2026-09-07");
    expect(settled.every((value) => value !== "")).toBe(true);
  });
});
