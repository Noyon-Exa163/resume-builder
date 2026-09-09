import { describe, expect, it } from "vitest";
import { formatBangladeshiPhone } from "@/lib/contact/formatPhone";

describe("formatBangladeshiPhone", () => {
  it("is idempotent on an already-canonical number", () => {
    expect(formatBangladeshiPhone("+880 1676 095 674")).toBe(
      "+880 1676 095 674",
    );
  });

  it("formats a compact +880-prefixed number", () => {
    expect(formatBangladeshiPhone("+8801676095674")).toBe(
      "+880 1676 095 674",
    );
  });

  it("formats a country code without a leading +", () => {
    expect(formatBangladeshiPhone("8801676095674")).toBe(
      "+880 1676 095 674",
    );
  });

  it("formats a local number with a leading 0 and dashes", () => {
    expect(formatBangladeshiPhone("01676-095674")).toBe("+880 1676 095 674");
  });

  it("formats a bare 10-digit national number", () => {
    expect(formatBangladeshiPhone("1676095674")).toBe("+880 1676 095 674");
  });

  it("strips punctuation noise (parens, dots, spaces)", () => {
    expect(formatBangladeshiPhone("+880 (1676) 095.674")).toBe(
      "+880 1676 095 674",
    );
  });

  it("leaves a non-Bangladeshi number unchanged", () => {
    expect(formatBangladeshiPhone("+1 555 123 4567")).toBe("+1 555 123 4567");
  });

  it("leaves unrecognizable input unchanged", () => {
    expect(formatBangladeshiPhone("N/A")).toBe("N/A");
    expect(formatBangladeshiPhone("12345")).toBe("12345");
    expect(formatBangladeshiPhone("")).toBe("");
  });
});
