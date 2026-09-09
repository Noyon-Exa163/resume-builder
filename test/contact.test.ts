import { describe, expect, it } from "vitest";
import {
  breakContactValue,
  compactProfileLabel,
  extractEntryContact,
  isSystemAlternatePhone,
  phonesForDisplay,
} from "@/lib/contact";

describe("phonesForDisplay", () => {
  it("always includes the system alternate number", () => {
    expect(phonesForDisplay()).toEqual(["+880 1676 095 674"]);
    expect(phonesForDisplay("")).toEqual(["+880 1676 095 674"]);
  });

  it("puts a personal number first, then the alternate", () => {
    expect(phonesForDisplay("01700-000000")).toEqual([
      "+880 1700 000 000",
      "+880 1676 095 674",
    ]);
  });

  it("does not duplicate the alternate when the author already entered it", () => {
    expect(phonesForDisplay("+880 1676-095674")).toEqual(["+880 1676 095 674"]);
  });

  it("splits a personal field that listed two numbers with a bar", () => {
    expect(phonesForDisplay("01770-222555 | 01516-162250")).toEqual([
      "+880 1770 222 555",
      "+880 1516 162 250",
      "+880 1676 095 674",
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

describe("extractEntryContact", () => {
  it("pulls email, phone, and a link out of mixed prose", () => {
    const extracted = extractEntryContact({
      description: "Email: ada@example.com  Phone: +880 1711-223344",
      bullets: ["https://linkedin.com/in/ada"],
      location: "Dhaka",
    });
    expect(extracted.items.map((item) => item.kind)).toEqual([
      "email",
      "phone",
      "link",
    ]);
    expect(extracted.items.map((item) => item.value)).toEqual([
      "ada@example.com",
      "+880 1711-223344",
      "https://linkedin.com/in/ada",
    ]);
    expect(extracted.description).toBeUndefined();
    expect(extracted.bullets).toEqual([]);
    expect(extracted.location).toBe("Dhaka");
  });

  it("does not treat a year range as a phone number", () => {
    const extracted = extractEntryContact({
      description: "Worked together 2019-2021",
    });
    expect(extracted.items).toEqual([]);
    expect(extracted.description).toBe("Worked together 2019-2021");
  });

  it("deduplicates the same email in two fields", () => {
    const extracted = extractEntryContact({
      description: "ada@example.com",
      bullets: ["ada@example.com"],
    });
    expect(extracted.items).toHaveLength(1);
    expect(extracted.bullets).toEqual([]);
  });

  it("drops Email/Phone/E:/P:/M: labels from leftover prose", () => {
    const extracted = extractEntryContact({
      bullets: [
        "E: ada@example.com",
        "P: +8801711223344",
        "M: +8801811223344",
        "Email: ada@example.com",
      ],
      subtitle: "Director, Acme  Phone: +8801711223344",
    });
    expect(extracted.items.map((item) => item.kind).sort()).toEqual([
      "email",
      "phone",
      "phone",
    ]);
    expect(extracted.bullets).toEqual([]);
    expect(extracted.subtitle).toBe("Director, Acme");
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
