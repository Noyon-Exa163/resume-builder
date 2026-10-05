import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SKILL_ICON_CATALOG } from "@/lib/skillIcons/catalog";
import { applySkillIconDefaults } from "@/lib/skillIcons/defaults";
import {
  listSkillIconClaims,
  resolveSkillIcon,
  resolveSkillIconSlug,
} from "@/lib/skillIcons/resolveSkillIcon";
import { createBlankResume, normalizeAndValidate } from "@/lib/schema/normalize";
import { ResumeDataSchema } from "@/lib/schema/resume";

describe("skill icon catalog", () => {
  it("has a rendered PNG for every entry", () => {
    const missing = SKILL_ICON_CATALOG.map(([slug]) => slug).filter(
      (slug) => !existsSync(path.join("public/skill-icons", `${slug}.png`)),
    );
    expect(missing).toEqual([]);
  });

  it("never lets two different icons claim the same spelling", () => {
    const owner = new Map<string, string>();
    const clashes: string[] = [];
    for (const { key, slug } of listSkillIconClaims()) {
      const existing = owner.get(key);
      if (existing && existing !== slug) clashes.push(`${key}: ${existing} vs ${slug}`);
      owner.set(key, slug);
    }
    expect(clashes).toEqual([]);
  });
});

describe("resolveSkillIconSlug", () => {
  it.each([
    ["Node.js", "nodejs"],
    ["NodeJS", "nodejs"],
    ["ReactJS", "react"],
    ["C++", "cplusplus"],
    ["C#", "csharp"],
    ["C", "c"],
    ["Golang", "go"],
    ["Go (familiar)", "go"],
    ["Azure (exposure)", "azure"],
    ["NGINX", "nginx"],
    ["Argo CD", "argocd"],
    ["GitLab CI/CD", "gitlab"],
    ["EKS", "aws-amazon-elastic-kubernetes-service"],
    ["Amazon Web Services (AWS)", "aws"],
  ])("maps %s to %s", (skill, slug) => {
    expect(resolveSkillIconSlug(skill)).toBe(slug);
  });

  it("keeps similar names apart", () => {
    expect(resolveSkillIconSlug("Java")).toBe("java");
    expect(resolveSkillIconSlug("JavaScript")).toBe("javascript");
    expect(resolveSkillIconSlug("C")).not.toBe(resolveSkillIconSlug("C++"));
  });

  it.each([
    "Leadership",
    "Troubleshooting",
    "Root Cause Analysis",
    "Bug Tracking (Jira)",
    "",
  ])("gives %j no icon rather than guessing", (skill) => {
    expect(resolveSkillIconSlug(skill)).toBeUndefined();
  });
});

describe("resolveSkillIcon", () => {
  it("points at the pre-rendered PNG", () => {
    expect(resolveSkillIcon("Docker")).toEqual({
      src: "/skill-icons/docker.png",
      widthRatio: 1,
    });
  });

  it("gives wide logos a wider slot, within a limit", () => {
    expect(resolveSkillIcon("Go")?.widthRatio).toBeGreaterThan(1);
    expect(resolveSkillIcon("jQuery")?.widthRatio).toBeLessThanOrEqual(2.5);
  });
});

describe("show skill icons setting", () => {
  const skillsSection = (showSkillIcons: boolean) => ({
    id: "skills-1",
    kind: "skills" as const,
    title: "Skills",
    visible: true,
    layout: "tags" as const,
    showSkillIcons,
    entries: [],
  });

  it("is off for a section saved before the setting existed", () => {
    const legacy = {
      id: "s",
      kind: "skills",
      title: "Skills",
      visible: true,
      layout: "tags",
      entries: [],
    };
    const parsed = ResumeDataSchema.parse({
      ...createBlankResume(),
      sections: [legacy],
    });
    expect(parsed.sections[0].showSkillIcons).toBe(false);
  });

  it("survives normalising a resume", () => {
    const resume = normalizeAndValidate({ sections: [skillsSection(true)] });
    expect(resume.sections[0].showSkillIcons).toBe(true);
  });

  it("starts off for a skills section the AI just created", () => {
    const current = { ...createBlankResume(), sections: [] };
    const update = applySkillIconDefaults(current, {
      sections: [{ ...skillsSection(true), id: "new-skills" }],
    });
    expect(update.sections?.[0]?.showSkillIcons).toBe(false);
  });

  it("keeps the person's choice when the AI edits an existing section", () => {
    const current = {
      ...createBlankResume(),
      sections: [skillsSection(false)],
    };
    const off = applySkillIconDefaults(current, { sections: [skillsSection(false)] });
    expect(off.sections?.[0]?.showSkillIcons).toBe(false);

    const on = applySkillIconDefaults(
      { ...current, sections: [skillsSection(true)] },
      { sections: [skillsSection(false)] },
    );
    expect(on.sections?.[0]?.showSkillIcons).toBe(true);
  });

  it("leaves other kinds of section alone", () => {
    const experience = { ...skillsSection(false), id: "x", kind: "experience" as const };
    const update = applySkillIconDefaults(createBlankResume(), {
      sections: [experience],
    });
    expect(update.sections?.[0]?.showSkillIcons).toBe(false);
  });
});
