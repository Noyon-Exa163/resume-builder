import { describe, expect, it } from "vitest";
import {
  SYSTEM_ALTERNATE_PHONE,
  breakContactValue,
  compactProfileLabel,
  isSystemAlternatePhone,
  phonesForDisplay,
} from "@/lib/contact";

describe("phonesForDisplay", () => {
  it("always includes the system alternate number", () => {
    expect(phonesForDisplay()).toEqual([SYSTEM_ALTERNATE_PHONE]);
    expect(phonesForDisplay("")).toEqual([SYSTEM_ALTERNATE_PHONE]);
  });

  it("puts a personal number first, then the alternate", () => {
    expect(phonesForDisplay("01700-000000")).toEqual([
      "01700-000000",
      SYSTEM_ALTERNATE_PHONE,
    ]);
  });

  it("does not duplicate the alternate when the author already entered it", () => {
    expect(phonesForDisplay("+880 1676-095674")).toEqual(["+880 1676-095674"]);
  });

  it("splits a personal field that listed two numbers with a bar", () => {
    expect(phonesForDisplay("01770-222555 | 01516-162250")).toEqual([
      "01770-222555",
      "01516-162250",
      SYSTEM_ALTERNATE_PHONE,
    ]);
  });
});

describe("isSystemAlternatePhone", () => {
  it("matches the embedded company number ignoring formatting", () => {
    expect(isSystemAlternatePhone("+8801676095674")).toBe(true);
    expect(isSystemAlternatePhone("+880 1676-095674")).toBe(true);
    expect(isSystemAlternatePhone("+8801755828090")).toBe(false);
  });
});

describe("compactProfileLabel", () => {
  it("keeps only the LinkedIn path because the icon names the network", () => {
    expect(
      compactProfileLabel("https://www.linkedin.com/in/talha-jubayer-b1"),
    ).toBe("in/talha-jubayer-b1");
  });

  it("keeps only the GitHub username", () => {
    expect(compactProfileLabel("https://github.com/jubayertalha")).toBe(
      "jubayertalha",
    );
  });

  it("strips the scheme from a generic website", () => {
    expect(compactProfileLabel("https://exabyting.com/")).toBe("exabyting.com");
  });
});

describe("breakContactValue", () => {
  it("leaves short values on one line", () => {
    expect(breakContactValue("ada@example.com", 24)).toBe("ada@example.com");
  });

  it("breaks a long email at @", () => {
    expect(
      breakContactValue("sheikh-talha-jubayer-rahman@exabyting.com", 24),
    ).toBe("sheikh-talha-jubayer-rahman\n@exabyting.com");
  });

  it("breaks a long address at the comma", () => {
    expect(breakContactValue("159/17, West Shewrapara, Dhaka", 18)).toBe(
      "159/17\nWest Shewrapara\nDhaka",
    );
  });
});
