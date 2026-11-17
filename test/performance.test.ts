import { beforeEach, describe, expect, it, vi } from "vitest";
import { Font } from "@react-pdf/renderer";

// templates/fonts.ts is imported as a side effect by every template Document
// (import "../fonts"). It registers TTFs by /fonts/ path, which don't exist
// under jsdom. Mock it to register standard built-in fonts instead so
// react-pdf can render without file I/O.
vi.mock("@/templates/fonts", () => {
  Font.register({
    family: "Inter",
    fonts: [
      { src: "Helvetica", fontWeight: 400 },
      { src: "Helvetica-Bold", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Gilroy",
    fonts: [
      { src: "Helvetica", fontWeight: 400 },
      { src: "Helvetica-Bold", fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word: string) => [word]);
  return {};
});

import type { ResumeData, SectionKind } from "@/lib/schema/resume";
import { getCachedPdfBlob, toPdfBlob } from "@/lib/export/toPdfBlob";
import { normalizeAndValidate } from "@/lib/schema/normalize";
import { createBlankResume } from "@/lib/schema/normalize";
import { flagImportIssues } from "@/lib/import/errorFlagging";
import { applyIssueFixes } from "@/lib/import/applyFixes";
import { findFieldByText } from "@/lib/editor/fieldMatch";
import { buildTextLines } from "@/components/editor/PdfCanvasViewer";
import { buildChatPrompt } from "@/lib/ai/chatPrompt";

const ITERATIONS = 10;

function buildSampleResume(): ResumeData {
  const resume = createBlankResume();
  resume.meta.title = "Performance Benchmark Resume";
  resume.personalInfo.fullName = "Ada Lovelace";
  resume.personalInfo.email = "ada@example.com";
  resume.personalInfo.phone = "+1-555-0100";
  resume.personalInfo.location = "London, UK";
  resume.personalInfo.website = "https://example.com";
  resume.personalInfo.linkedin = "https://linkedin.com/in/adalovelace";
  resume.personalInfo.github = "https://github.com/adalovelace";
  resume.summary =
    "Experienced software engineer with a track record of building and " +
    "shipping production systems. Passionate about performance, " +
    "accessibility, and clean, maintainable code.";

  const kinds: SectionKind[] = [
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "languages",
    "awards",
  ];

  let sectionIndex = 0;
  for (const kind of kinds) {
    const entries = [];
    for (let j = 0; j < 8; j += 1) {
      entries.push({
        id: `bench-${sectionIndex}-${j}`,
        title: `Role or Project ${j + 1}`,
        subtitle: `Position ${j + 1}`,
        organization: "Example Corp",
        location: "Remote",
        startDate: "Jan 2020",
        endDate: j === 7 ? undefined : "Dec 2024",
        isCurrent: j === 7,
        bullets: [
          "Led a team of engineers delivering customer-facing features.",
          "Improved page load times by 40% through code splitting and caching.",
          "Mentored junior developers and ran code reviews.",
        ],
        tags: ["TypeScript", "React", "Node.js"],
      });
    }
    resume.sections.push({
      id: `bench-section-${sectionIndex}`,
      kind,
      title: kind.charAt(0).toUpperCase() + kind.slice(1),
      visible: true,
      layout: "list",
      showSkillIcons: false,
      entries,
    });
    sectionIndex += 1;
  }

  return normalizeAndValidate(resume);
}

function timeSyncMs<T>(label: string, fn: () => T): { result: T; ms: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`[bench] ${label}: ${(end - start).toFixed(2)}ms`);
  return { result, ms: end - start };
}

async function timeAsyncMs<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  console.log(`[bench] ${label}: ${(end - start).toFixed(2)}ms`);
  return { result, ms: end - start };
}

function summaryMs(label: string, timings: number[]): void {
  timings.sort((a, b) => a - b);
  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  const p50 = timings[Math.floor(timings.length * 0.5)];
  const p95 = timings[Math.ceil(timings.length * 0.95) - 1];
  console.log(
    `[bench] ${label} summary: avg=${avg.toFixed(2)}ms p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms min=${timings[0].toFixed(2)}ms max=${timings[timings.length - 1].toFixed(2)}ms`,
  );
}

describe("ExaResume performance benchmarks", () => {
  let sample: ResumeData;

  beforeEach(() => {
    sample = buildSampleResume();
  });

  it("toPdfBlob render baseline", { timeout: 60_000 }, async () => {
    const timings: number[] = [];
    // Warm up
    await toPdfBlob(sample);
    for (let i = 0; i < ITERATIONS; i += 1) {
      const { ms } = await timeAsyncMs(`toPdfBlob #${i + 1}`, () =>
        toPdfBlob(sample),
      );
      timings.push(ms);
    }
    summaryMs("toPdfBlob", timings);
    expect(timings[0]).toBeGreaterThan(0);
  });

  it("normalizeAndValidate baseline", async () => {
    const partial = {
      personalInfo: { fullName: "Test User", email: "test@example.com" },
      sections: sample.sections.map((s) => ({ ...s })),
    };
    const timings: number[] = [];
    for (let i = 0; i < ITERATIONS; i += 1) {
      const { ms } = timeSyncMs(`normalizeAndValidate #${i + 1}`, () =>
        normalizeAndValidate(partial),
      );
      timings.push(ms);
    }
    summaryMs("normalizeAndValidate", timings);
    expect(timings[0]).toBeGreaterThan(0);
  });

  it("previewKey computation baseline", async () => {
    const timings: number[] = [];
    for (let i = 0; i < ITERATIONS; i += 1) {
      const { ms } = timeSyncMs(`previewKey #${i + 1}`, () => {
        const key = JSON.stringify({
          ...sample,
          meta: { ...sample.meta, updatedAt: null },
        });
        return key;
      });
      timings.push(ms);
    }
    summaryMs("previewKey", timings);
    expect(timings[0]).toBeGreaterThan(0);
  });

  it("getCachedPdfBlob cache-hit baseline (second render of same content)", { timeout: 60_000 }, async () => {
    const key = JSON.stringify({
      ...sample,
      meta: { ...sample.meta, updatedAt: null },
    });
    // Cold render
    await getCachedPdfBlob(key, () => toPdfBlob(sample));
    const timings: number[] = [];
    for (let i = 0; i < ITERATIONS; i += 1) {
      const { ms } = await timeAsyncMs(`getCachedPdfBlob hit #${i + 1}`, () =>
        getCachedPdfBlob(key, () => toPdfBlob(sample)),
      );
      timings.push(ms);
    }
    summaryMs("getCachedPdfBlob cache-hit", timings);
    expect(timings[0]).toBeGreaterThan(0);
  });

  it("flagImportIssues baseline (large extracted resume)", () => {
    const timings: number[] = [];
    for (let i = 0; i < ITERATIONS; i += 1) {
      const { ms } = timeSyncMs(`flagImportIssues #${i + 1}`, () =>
        flagImportIssues(sample),
      );
      timings.push(ms);
    }
    summaryMs("flagImportIssues", timings);
    expect(timings[0]).toBeGreaterThan(0);
  });

  it("applyIssueFixes baseline (every issue fixed at once)", () => {
    const issues = flagImportIssues(sample);
    const allIds = issues.map((issue) => issue.id);
    const timings: number[] = [];
    for (let i = 0; i < ITERATIONS; i += 1) {
      const { ms } = timeSyncMs(`applyIssueFixes #${i + 1}`, () =>
        applyIssueFixes(sample, issues, allIds),
      );
      timings.push(ms);
    }
    summaryMs("applyIssueFixes", timings);
    expect(timings[0]).toBeGreaterThan(0);
  });

  it("findFieldByText baseline (no-match worst case, full scan)", () => {
    const timings: number[] = [];
    for (let i = 0; i < ITERATIONS; i += 1) {
      const { ms } = timeSyncMs(`findFieldByText #${i + 1}`, () =>
        findFieldByText(sample, "text that matches absolutely nothing"),
      );
      timings.push(ms);
    }
    summaryMs("findFieldByText (no match)", timings);
    expect(timings[0]).toBeGreaterThan(0);
  });

  it("buildTextLines baseline (dense page of pdfjs runs)", () => {
    // ~600 runs ≈ a dense resume page: 50 lines x 12 fragments, kerning
    // splits and multi-run lines mixed, baselines interleaved by y.
    const runs: Array<{
      str: string;
      width: number;
      height: number;
      transform: number[];
    }> = [];
    for (let line = 0; line < 50; line += 1) {
      const baselineY = 760 - line * 14;
      for (let fragment = 0; fragment < 12; fragment += 1) {
        runs.push({
          str: `run ${line}-${fragment}`,
          width: 60,
          height: 11,
          transform: [1, 0, 0, 1, 72 + fragment * 64, baselineY],
        });
      }
    }
    const timings: number[] = [];
    for (let i = 0; i < ITERATIONS; i += 1) {
      const { ms } = timeSyncMs(`buildTextLines #${i + 1}`, () =>
        buildTextLines(runs),
      );
      timings.push(ms);
    }
    summaryMs("buildTextLines (600 runs)", timings);
    expect(timings[0]).toBeGreaterThan(0);
  });

  it("buildChatPrompt baseline (schema + full resume serialization)", () => {
    const timings: number[] = [];
    for (let i = 0; i < ITERATIONS; i += 1) {
      const { ms } = timeSyncMs(`buildChatPrompt #${i + 1}`, () =>
        buildChatPrompt({
          resume: sample,
          history: [
            { role: "user" as const, content: "Add a skills section." },
            { role: "assistant" as const, content: "Done — added Skills." },
          ],
          message: "Now rename Experience to Work History.",
        }),
      );
      timings.push(ms);
    }
    summaryMs("buildChatPrompt", timings);
    expect(timings[0]).toBeGreaterThan(0);
  });
});
