/**
 * Generates the product-owner report DOCX: before/after profiles, issues,
 * bottlenecks, improvements, new features, and the improvement audit.
 *
 *   npx tsx scripts/generateFeatureReport.ts
 *
 * Writes ExaResume-Report-<date>.docx into the project root.
 */
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { writeFileSync } from "node:fs";

const BRAND = "0072ED";
const INK = "1C283C";
const GREY = "45556C";
const LIGHT = "F0F5FE";

const RE_DATE = "12 November 2026";

function h1(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, color: INK })],
  });
}

function h2(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, color: INK })],
  });
}

function h3(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, color: GREY })],
  });
}

function para(text: string, opts?: { bold?: boolean; italics?: boolean }) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 21, bold: opts?.bold, italics: opts?.italics, color: INK })],
  });
}

function bullet(text: string, boldPrefix?: string) {
  const runs = boldPrefix
    ? [
        new TextRun({ text: `${boldPrefix} — `, bold: true, size: 21, color: INK }),
        new TextRun({ text, size: 21, color: INK }),
      ]
    : [new TextRun({ text, size: 21, color: INK })];
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: runs });
}

function cell(text: string, opts?: { header?: boolean; width?: number }) {
  return new TableCell({
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts?.header
      ? { type: ShadingType.SOLID, fill: BRAND, color: "auto" }
      : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            size: opts?.header ? 20 : 19,
            bold: opts?.header,
            color: opts?.header ? "FFFFFF" : INK,
          }),
        ],
      }),
    ],
  });
}

function table(headers: string[], rows: string[][], widths: number[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => cell(h, { header: true, width: widths[i] })),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((value, i) => cell(value, { width: widths[i] })),
          }),
      ),
    ],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 160 }, children: [] });
}

const children: (Paragraph | Table)[] = [];

/* ── Cover ──────────────────────────────────────────────────────────── */
children.push(
  new Paragraph({ spacing: { before: 2400 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "ExaResume", bold: true, size: 56, color: BRAND }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: "Performance & Features Report",
        bold: true,
        size: 36,
        color: INK,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "Before / after profiling, issues, bottlenecks, improvements, new features, and the improvement audit",
        size: 22,
        color: GREY,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 600 },
    children: [
      new TextRun({
        text: `Prepared for the product owner · ${RE_DATE}`,
        size: 20,
        color: GREY,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "All numbers measured on the local verification stack; see Methodology.",
        size: 18,
        italics: true,
        color: GREY,
      }),
    ],
  }),
  new Paragraph({ pageBreakBefore: true, children: [] }),
);

/* ── 1. Executive summary ───────────────────────────────────────────── */
children.push(
  h1("1. Executive Summary"),
  para(
    "All five product-owner requirements — Performance Boost, Email Invite & Onboarding, Smart Error Flagging, Inline Canvas Editing, and the Improvement Audit — are implemented and verified end-to-end on the live stack. The review that opened this cycle found that two of the five features were non-functional (inline canvas editing had zero working interactions; the invite flow failed at three independent points) and that performance was unprofiled. This report records the before and after profiles with measured numbers, every issue found and fixed, the bottlenecks identified, the new features delivered, and the audit outcomes.",
  ),
  bullet("Preview repaints of unchanged content went from a full 330ms render to a ~0.004ms cache lookup; five consecutive repaints dropped from 286.6ms to 51.6ms (6× faster).", "Performance"),
  bullet("3 product-level defect clusters fixed: inline editing (5 defects), invite flow (6 defects), and a database write-path bug that silently corrupted every stored resume under the new Postgres driver.", "Quality"),
  bullet("Unit tests grew from 268 to 327 (+59), all green; TypeScript compiles with zero errors; the production build and the Playwright golden path pass.", "Verification"),
  bullet("Six improvement-audit proposals were proposed and all six built: invite management UI, onboarding profile details, deeper performance baselines, a migration runner, dead-code removal (~700 lines), and server-side session revocation.", "Audit"),
);

/* ── 2. Scope & method ──────────────────────────────────────────────── */
children.push(
  h1("2. Scope & Method"),
  para(
    "\"Before\" means the committed HEAD behaviour at the start of the cycle: no render cache, no profiling, and the features as first delivered. \"After\" means the current working tree. Performance numbers come from a reproducible benchmark suite (test/performance.test.ts, Vitest) executed on the local verification stack: Next.js 16 dev/prod builds, React 19, react-pdf rendering in jsdom, Postgres 16 in Docker. Machine-relative — always compare same-machine runs. p50 is the trusted figure; first iterations include JIT warm-up.",
  ),
  para(
    "Functional verification used real browser sessions (Playwright/Chromium) against the running app with the real database, including the product owner's actual resume, plus API-level end-to-end tests (login → invite → onboarding → session revocation) with curl against the production build.",
  ),
);

/* ── 3. Features: requirements vs delivered ─────────────────────────── */
children.push(
  h1("3. Features — Requirements vs Delivered"),
  table(
    ["Requirement (product owner)", "Before", "After", "Evidence"],
    [
      [
        "1. Performance Boost — profile, set baselines, fix bottlenecks, verify with before/after numbers",
        "Unprofiled; preview re-rendered fully on every repaint (~330ms each); no baseline metrics",
        "Content-keyed render cache (LRU, failure-safe); full benchmark suite + recorded baselines; identical repaints ~0.004ms; scenario 6× faster",
        "Benchmark suite + docs/performance-baselines.md; §6–§8 of this report",
      ],
      [
        "2. Email Invite & Onboarding — invite by email with notification; invitees set password, name and profile details on first login",
        "Flow broken end-to-end: proxy blocked the invite page and APIs; onboarding read the wrong parameter; invite API crashed on Next 16 params; email was a console stub",
        "Working end-to-end: admin invites (with management UI: re-send/revoke), Resend REST delivery, onboarding collects name + password + avatar, session starts immediately",
        "Live API walkthrough + browser sessions; §9",
      ],
      [
        "3. Smart Error Flagging — flag wrong/inconsistent info after extraction, one-click Fix or Ignore",
        "Detection worked and blocked commit, but the Fix button was cosmetic: every suggestion was null and the applier corrupted data paths",
        "Real one-click fixes (email cleanup, kind-based titles, rename duplicates, remove empty items, drop contradictory end dates) with an immutable, index-safe applier; Ignore unchanged",
        "23 dedicated unit tests; verified before every AI import commit",
      ],
      [
        "4. Inline Canvas Editing — click any element in the preview to edit it directly",
        "Zero functional interactions: overlays never rendered (pdfjs filter bug); even when fixed, entry fields were a silent no-op (path parser bug); hover covered whole lines",
        "Click-to-edit on every text element: hover windows hug each run; phones match by digits, dates by parsed meaning; date ranges resolve start vs end by click position; alternate number offers explain/hide",
        "Verified live on the product owner's resume; 26 field-matching tests",
      ],
      [
        "5. Improvement Audit — review for gaps, propose improvements, build the approved ones",
        "Not started",
        "Audit delivered; all six proposals proposed and built (see §10)",
        "§10; git working tree",
      ],
    ],
    [24, 24, 28, 24],
  ),
);

/* ── 4. Issues before ───────────────────────────────────────────────── */
children.push(
  h1("4. Issues Found — Before"),
  h2("4.1 Feature-blocking defects (as first delivered)"),
  table(
    ["ID", "Issue", "Impact", "Status"],
    [
      [
        "I-01",
        "pdfjs text-item filter checked a field that does not exist, so every hit overlay was skipped",
        "Inline canvas editing completely non-functional",
        "Fixed",
      ],
      [
        "I-02",
        "Field-path parser glued array indices into keys (\"sections[0]\" → key \"sections0\")",
        "Entry title/bullet/tag edits silently did nothing",
        "Fixed",
      ],
      [
        "I-03",
        "Import issue suggestions were all null; the Fix button was a disguised Ignore",
        "Spec half-delivered; users had to hand-fix everything",
        "Fixed",
      ],
      [
        "I-04",
        "The fix applier wrote into junk keys (\"sections0\") and clobbered sibling data",
        "Any future suggestion would have wiped extracted content",
        "Fixed (replaced with lib/import/applyFixes.ts)",
      ],
      [
        "I-05",
        "proxy.ts did not allow-list the invite page and invite APIs",
        "Invitees were redirected to login — invites unusable",
        "Fixed",
      ],
      [
        "I-06",
        "Onboarding page read the token from the query string; emails link a path segment",
        "Always showed \"No invite token provided\"",
        "Fixed",
      ],
      [
        "I-07",
        "Invite API used the pre-Next-15 synchronous params API",
        "Token undefined at runtime; TypeScript build failed",
        "Fixed",
      ],
      [
        "I-08",
        "Email sending was a console.log stub returning success",
        "No notification ever delivered; UI pretended it was sent",
        "Fixed (Resend REST; honest fallback)",
      ],
      [
        "I-09",
        "Alternate number shown on every new blank resume by default",
        "Blank resumes printed company data the author never entered",
        "Changed per product decision: hidden by default, opt-in per resume",
      ],
    ],
    [8, 34, 33, 25],
  ),
  h2("4.2 Defects found by running the real stack"),
  table(
    ["ID", "Issue", "Impact", "Status"],
    [
      [
        "D-01",
        "postgres.js stores pre-stringified JSON parameters as jsonb string scalars (the old Neon driver accepted them)",
        "Every saved resume, version snapshot, and admin setting was double-encoded; the dashboard listed zero resumes; versions corrupted",
        "Fixed (5 write sites) + idempotent repair migration 0011 (14 rows repaired)",
      ],
      [
        "D-02",
        "seedAdmin never exited — the new driver's connection pool kept the process alive",
        "Bootstrap script appeared to hang",
        "Fixed (sql.end())",
      ],
      [
        "D-03",
        "Cached render promises kept rejected promises forever",
        "One transient render failure permanently broke the preview until reload",
        "Fixed (evict on rejection + LRU cap)",
      ],
      [
        "D-04",
        "Committed Playwright golden path expected a Log Out button that had moved into a dropdown menu",
        "E2E failed 1 of 2",
        "Fixed (portal-aware locators + settle waits); 2/2 green",
      ],
      [
        "D-05",
        "Date and phone matching compared printed (reformatted) text to stored (canonical) values",
        "Clicking a mobile number or date range opened nothing or the wrong field",
        "Fixed (digit- and date-aware matching)",
      ],
      [
        "D-06",
        "Inline-edit hit windows could overlap; the editing popover spanned the whole line",
        "Clicking one field opened another's editor",
        "Fixed (per-run windows, pairwise-clamped bands, run-sized popover)",
      ],
    ],
    [8, 34, 33, 25],
  ),
);

/* ── 5. Bottlenecks ─────────────────────────────────────────────────── */
children.push(
  h1("5. Bottlenecks Identified"),
  bullet(
    "Full react-pdf layout + render (~330ms p50 on a full resume) ran on EVERY preview repaint — including identical repaints such as theme toggles. This was the single dominant cost.",
    "B-01 Preview render on every repaint",
  ),
  bullet(
    "The Zod schema validation + id backfill run per save (~0.35ms) — measured and confirmed negligible.",
    "B-02 Save-path validation",
  ),
  bullet(
    "Click-to-field matching, line grouping, import flagging/fixing, and prompt building were suspected costs; profiling shows all are sub-millisecond even on dense resumes (§7).",
    "B-03 Suspected interactive costs",
  ),
  bullet(
    "Phone numbers print reformatted (+880 prefix, spacing) and dates print reformatted from canonical storage — not a CPU bottleneck but a correctness bottleneck that made text matching impossible without format-aware comparison.",
    "B-04 Format drift between storage and print",
  ),
);

/* ── 6. Before profile ──────────────────────────────────────────────── */
children.push(
  h1("6. Before Profile (HEAD behaviour, measured)"),
  para(
    "The committed pipeline rendered on every preview repaint with no cache and no profiling. Numbers below are the uncached render path (the exact HEAD code) and the state of the tooling.",
  ),
  table(
    ["User action", "What ran", "Measured cost"],
    [
      [
        "Preview update after typing (debounced 400ms)",
        "Full toPdfBlob — every time",
        "~330ms per update (full 8×8 resume)",
      ],
      [
        "Theme/accent toggle and back (identical content)",
        "Full toPdfBlob — every time",
        "~330ms each way; 5 repaints = 286.6ms total on an 18-entry resume (53–66ms each)",
      ],
      [
        "Save (debounced)",
        "Zod validate + id backfill",
        "~0.35ms",
      ],
      [
        "Render failure (transient)",
        "No protection: broken preview until full page reload",
        "n/a",
      ],
      [
        "Profiling / baselines",
        "None existed",
        "—",
      ],
    ],
    [30, 40, 30],
  ),
  spacer(),
);

/* ── 7. After profile ───────────────────────────────────────────────── */
children.push(
  h1("7. After Profile (current tree, measured)"),
  table(
    ["Path", "p50", "p95", "Notes"],
    [
      ["toPdfBlob — cold render, full 8×8 resume", "328.5ms", "419.8ms", "Unchanged by design; the inherent react-pdf cost"],
      ["getCachedPdfBlob — cache hit (identical content)", "0.00ms", "0.10ms", "Repaints of unchanged content are a Map lookup"],
      ["normalizeAndValidate (per save)", "0.35ms", "0.51ms", "Schema validate + id backfill"],
      ["previewKey computation (per keystroke)", "0.05ms", "0.31ms", "Keys the blob cache by content"],
      ["flagImportIssues (per import)", "0.03ms", "1.10ms", "All detectors, full resume"],
      ["applyIssueFixes (every issue fixed at once)", "0.00ms", "0.18ms", "Single immutable rebuild pass"],
      ["findFieldByText — canvas click, no-match worst case", "0.65ms", "2.61ms", "Full field scan incl. digit/date fallbacks"],
      ["buildTextLines — 600-run dense page", "0.21ms", "0.74ms", "Per preview render; per-run hit windows"],
      ["buildChatPrompt (schema + resume JSON)", "0.06ms", "0.22ms", "Per chat turn"],
    ],
    [34, 14, 14, 38],
  ),
  spacer(),
);

/* ── 8. Measured improvements ───────────────────────────────────────── */
children.push(
  h1("8. Measured Improvements"),
  table(
    ["Scenario", "Before", "After", "Improvement"],
    [
      [
        "Repaint identical content once (theme toggle back, undo)",
        "~330ms full render",
        "~0.004ms cache hit",
        "~80,000× for the lookup",
      ],
      [
        "5 identical repaints (18-entry resume)",
        "286.6ms total (53–66ms each)",
        "51.6ms total — 1 cold render + 4 hits at 0.0ms",
        "6× faster; N repaints amortize to 1 render",
      ],
      [
        "Typing → preview update (new content)",
        "400ms debounce + one render",
        "Unchanged by design",
        "Cache cannot help new content; kept smooth by debounce",
      ],
      [
        "Transient render failure",
        "Preview permanently broken until reload",
        "Failed render evicted; next request re-renders",
        "Correctness fix",
      ],
      [
        "Memory during long editing sessions",
        "Unbounded blob retention",
        "LRU-capped at 4 blobs",
        "Bounded memory",
      ],
      [
        "New interactive capabilities (click-to-edit, import fixes, chat prompt build)",
        "did not exist",
        "all sub-millisecond (p50 ≤ 0.65ms)",
        "Capability added at no measurable cost",
      ],
    ],
    [30, 22, 24, 24],
  ),
  spacer(),
  para(
    "Interpretation: the profiling confirmed that the render pipeline was the only real bottleneck and that the fix eliminates the repeat cost entirely. Every newly added interactive feature was benchmarked before shipping and costs a fraction of a millisecond, so the capability growth did not regress the profile.",
  ),
);

/* ── 9. New features implemented ────────────────────────────────────── */
children.push(
  h1("9. New Features Implemented"),
  bullet(
    "Click any text in the preview to edit it inline; the popover hugs the clicked text. Hover windows per text run; phones match by digit sequence; dates match by parsed meaning; date ranges resolve start vs end by click position; the system alternate number opens an explain-and-hide card.",
    "Inline Canvas Editing",
  ),
  bullet(
    "Import review lists wrong/inconsistent extraction with severities and real one-click fixes (email cleanup, section titles, rename duplicates, remove empty items, drop contradictory end dates). Commit is blocked until errors are resolved.",
    "Smart Error Flagging",
  ),
  bullet(
    "Admin invites users by email (Resend REST integration); invitees set name, password, and avatar on a public onboarding page. Admins manage invites (list, re-send, revoke).",
    "Email Invite & Onboarding",
  ),
  bullet(
    "Content-keyed render cache (LRU, failure-safe), reproducible benchmark suite, recorded baselines document, and dev-only-safe profiling.",
    "Performance Instrumentation",
  ),
  bullet(
    "Server-side session revocation — logout and password changes invalidate existing tokens everywhere; migration 0012 + version-bound tokens.",
    "Session Security",
  ),
  bullet(
    "Migration runner (npm run db:migrate) with tracking table, per-migration transactions, advisory lock, and a --baseline mode; migrations 0010–0012 authored/applied.",
    "Database Tooling",
  ),
  bullet(
    "Dashboard Duplicate & Rename actions; local Postgres via Docker Compose with a postgres.js driver; invite management panel; login/selection/accessibility polish.",
    "Workspace Quality",
  ),
);

/* ── 10. Improvement audit ──────────────────────────────────────────── */
children.push(
  h1("10. Improvement Audit Report"),
  para(
    "The audit reviewed all surfaces for gaps, proposed improvements, and built the approved set. Outcome of each proposal:",
  ),
  table(
    ["Proposal", "Outcome", "Verification"],
    [
      [
        "P1 Invite management UI (list / re-send / revoke)",
        "Built — panel on the Users page + DELETE /api/invites/[token]",
        "Live browser drive; DB row deleted on revoke",
      ],
      [
        "P2 Collect profile details at onboarding",
        "Built — avatar color/expression picker on the onboarding page, persisted with the account",
        "Live: account created with avatar persisted",
      ],
      [
        "P3 Deeper performance profiling",
        "Built — 5 new benchmarks covering all interactive paths; baselines recorded",
        "docs/performance-baselines.md",
      ],
      [
        "P4 Migration runner",
        "Built — npm run db:migrate with tracking, transactions, advisory lock, --baseline",
        "Applied 12 migrations on a fresh database; idempotency verified",
      ],
      [
        "P5 Dead-code removal",
        "Built — one-shot AI parse path, legacy admin gate, and test-only heuristic parser removed (~700 lines)",
        "Zero references; tsc/build/tests green",
      ],
      [
        "P6 Session revocation",
        "Built — version-bound tokens; logout revokes server-side; password change revokes other sessions",
        "Live: pre-logout cookie rejected with 401 after logout",
      ],
    ],
    [30, 42, 28],
  ),
  para(
    "Additional audit findings acted on: stale E2E golden path repaired, the seed script exit hang fixed, unused dependencies and dead instrumentation removed, invisible scrollbars and text-selection contrast fixed, and the onboarding form's missing label associations corrected.",
    undefined,
  ),
);

/* ── 11. Quality metrics ────────────────────────────────────────────── */
children.push(
  h1("11. Quality Metrics"),
  table(
    ["Metric", "Before", "After"],
    [
      ["Unit tests", "268 passing (34 files)", "327 passing (38 files), +59 tests"],
      ["End-to-end (Playwright golden path)", "1 of 2 passing (stale spec)", "2 of 2 passing"],
      ["TypeScript", "1 error (stale invite params)", "0 errors"],
      ["ESLint", "20 warnings, 0 errors", "11 pre-existing warnings, 0 errors"],
      ["Production build", "Passing (with broken invite route)", "Passing (22 routes)"],
      ["Database integrity", "All jsonb writes double-encoded", "All writes correct; repair migration applied"],
      ["Known data-loss risks", "Stale-draft autosave races; poisoned render cache", "Resolved (eviction, revocation, repair)"],
    ],
    [30, 34, 36],
  ),
  spacer(),
);

/* ── 12. Remaining items ────────────────────────────────────────────── */
children.push(
  h1("12. Remaining Items & Deployment Notes"),
  bullet(
    "Set RESEND_API_KEY and RESEND_FROM in the production environment so invite emails deliver; without them the UI offers a copyable invite link (honest fallback).",
    "Email delivery",
  ),
  bullet(
    "Apply migrations 0010–0012 to the production database at deploy (npm run db:migrate; run --baseline once when adopting the runner).",
    "Database",
  ),
  bullet(
    "All work is currently uncommitted on main per instruction; suggested split is six focused feature commits plus the defect-fix commits, each buildable in order.",
    "Version control",
  ),
  bullet(
    "The system alternate phone number is fixed company data and intentionally not text-editable; if a per-resume custom alternate is wanted, it becomes a schema change (start/end stored field) — sized but not built.",
    "Product decision open",
  ),
  bullet(
    "A pre-existing dev-only hydration warning exists on the login page (caret-color style mismatch) — cosmetic, no user impact.",
    "Noted",
  ),
);

/* ── Document ───────────────────────────────────────────────────────── */
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 21 } },
    },
  },
  sections: [
    {
      properties: {
        page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "ExaResume — Performance & Features Report · ", size: 16, color: GREY }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

async function main(): Promise<void> {
  const buffer = await Packer.toBuffer(doc);
  const out = `ExaResume-Report-${new Date().toISOString().slice(0, 10)}.docx`;
  writeFileSync(out, buffer);
  console.log(`Wrote ${out} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`generateFeatureReport failed: ${message}`);
  process.exit(1);
});
