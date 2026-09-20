import { describe, expect, it } from "vitest";
import {
  fixBrandCasing,
  fixBrandCasingDeep,
  uppercaseKeepingBrands,
} from "@/lib/schema/brandCasing";

describe("fixBrandCasing", () => {
  it("always writes bKash", () => {
    expect(fixBrandCasing("Bkash, BKASH and bkash")).toBe(
      "bKash, bKash and bKash",
    );
  });

  it("leaves hosts, handles, and other words alone", () => {
    expect(fixBrandCasing("https://bkash.com @bkash bkashy")).toBe(
      "https://bkash.com @bkash bkashy",
    );
  });
});

describe("uppercaseKeepingBrands", () => {
  it("uppercases everything but the brand", () => {
    expect(uppercaseKeepingBrands("Projects at bKash")).toBe("PROJECTS AT bKash");
  });
});

describe("fixBrandCasingDeep", () => {
  it("fixes nested strings and skips photo data", () => {
    const result = fixBrandCasingDeep({
      a: ["Worked at BKASH"],
      photoDataUrl: "data:image/png;base64,Bkash",
    });
    expect(result.a[0]).toBe("Worked at bKash");
    expect(result.photoDataUrl).toBe("data:image/png;base64,Bkash");
  });
});
