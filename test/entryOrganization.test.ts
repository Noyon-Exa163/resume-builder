import { describe, expect, it } from "vitest";
import {
  entrySubtitle,
  splitDesignationAndCompany,
} from "@/lib/schema/entryOrganization";

describe("splitDesignationAndCompany", () => {
  it("uses a saved organization as is", () => {
    expect(
      splitDesignationAndCompany({
        subtitle: "Head of Engineering, Platform",
        organization: "Acme",
      }),
    ).toEqual({ designation: "Head of Engineering, Platform", company: "Acme" });
  });

  it("splits a combined subtitle at the last comma", () => {
    expect(
      splitDesignationAndCompany({
        subtitle: "Sr. Software Engineer (QA), Cefalo Bangladesh Ltd.",
      }),
    ).toEqual({
      designation: "Sr. Software Engineer (QA)",
      company: "Cefalo Bangladesh Ltd.",
    });
  });

  it("does not cut a company name before Inc. or Ltd", () => {
    expect(splitDesignationAndCompany({ subtitle: "CTO, Acme, Inc." })).toEqual({
      designation: "CTO, Acme, Inc.",
      company: "",
    });
  });

  it("leaves a subtitle without a comma as the designation", () => {
    expect(splitDesignationAndCompany({ subtitle: "Director" })).toEqual({
      designation: "Director",
      company: "",
    });
    expect(splitDesignationAndCompany({})).toEqual({ designation: "", company: "" });
  });
});

describe("entrySubtitle", () => {
  it("joins subtitle and organization", () => {
    expect(entrySubtitle({ subtitle: "CTO", organization: "Acme" })).toBe("CTO, Acme");
    expect(entrySubtitle({ organization: "Acme" })).toBe("Acme");
    expect(entrySubtitle({})).toBe("");
  });
});
