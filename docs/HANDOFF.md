# Hand-off — Exabyting Resume Builder

_Written 2026-09-07, after Phase 0 (scaffolding) landed in commit `bf29f82`. A
different agent/session is taking over from here — read this fully, then read
the two files it points to, before writing any code._

## Read these two files first, in order

1. **`docs/plans/2026-09-07-resume-builder-plan.md`** — the authoritative
   architecture and build plan. Contains: the full package list, the Zod
   `ResumeData` schema, the template registry contract, the AI provider
   adapter interface, the import/export pipelines, the phased build order,
   and an "Architecture decision log" explaining *why* certain approaches
   were chosen (and rejected) — read that log before proposing an alternative
   to something in it, since it likely covers a tradeoff already considered.
2. **`AGENTS.md`** (repo root) — engineering conventions and the ExaDesign
   design system for the app chrome. Its YAML frontmatter is the real,
   locked design tokens (colors/spacing/type/etc.) — do not invent new
   values. Its body explains the modularity rules this codebase follows and,
   critically, the **two separate styling systems** in play (see below).

## One-paragraph project summary

An internal Exabyting tool so any employee (technical or not) can fill out
their resume in a form and export a pixel-perfect, company-branded PDF (also
PNG, Markdown, and DOCX). Top priority: design fidelity of the exported PDF.
Also needs: import from an existing PDF/DOCX/Markdown resume (with a
free heuristic parser or an AI-assisted parser), and an admin Settings page
to configure shared AI API keys (Gemini, Anthropic, OpenRouter, DeepSeek,
plus a custom OpenAI-compatible slot). No user accounts yet. Hosted on
Netlify as one Next.js app.

## The one thing most likely to trip you up

**Two completely separate styling systems exist in this codebase and must
never mix:**

- **App chrome** (dashboard, editor, settings UI) → plain CSS + CSS custom
  properties from `styles/tokens.css` (ExaDesign), one co-located `.css`
  file per component, no Tailwind, no CSS-in-JS.
- **Resume templates** (`templates/*`) → `@react-pdf/renderer` primitives
  (`View`/`Text`/`Image`/`StyleSheet.create()`), values from a per-template
  `tokens.ts` (plain JS constants — react-pdf cannot read CSS variables).
  This is not a CSS file and never imports one.

If you're about to write a `<div className="...">` inside anything under
`templates/`, or a `View`/`Text` from react-pdf inside `components/`,
stop — you're in the wrong system.

## What exists right now (do not redo this)

- Next.js 16 App Router + TypeScript, no `src/` dir, no Tailwind, deployed
  target is Netlify (`netlify.toml` present, uses `@netlify/plugin-nextjs`).
- All packages from the plan's package list are installed (see
  `package.json`) — including `@react-pdf/renderer`, `pdfjs-dist`,
  `mammoth`, `docx`, `@netlify/blobs`, `@base-ui/react` (note: **not**
  `@base-ui-org/react` — that name in older docs is stale/wrong),
  `lucide-react`, `@dnd-kit/*`, `zustand`, `idb`, `zod`, plus
  `vitest`/`@testing-library/react`/`@playwright/test`/`prettier` as dev deps.
- `styles/tokens.css` + `styles/globals.css` wired up; `app/layout.tsx` loads
  Inter + JetBrains Mono via `next/font/google`. **Gilroy (the display font)
  is not loaded yet** — no licensed source configured. Falls back to Inter.
- `app/page.tsx` is a placeholder ("scaffolding in progress") — replace it
  with the real dashboard in Phase 1.
- Core `lib/` skeleton, all matching the plan's contracts exactly:
  - `lib/schema/resume.ts` — the full `ResumeData` Zod schema (single source
    of truth). `lib/schema/normalize.ts` — `normalizeAndValidate()` /
    `createBlankResume()`, the one path every write (editor save, import
    commit) should go through.
  - `lib/storage/types.ts` — generic `StorageAdapter<T>`.
    `lib/storage/indexeddb/` — working IndexedDB-backed
    `resumeRepository: StorageAdapter<ResumeData>` via `idb`.
    `lib/storage/settings/` — `SettingsStore` interface +
    `netlifyBlobsSettingsStore` implementation (server-side only,
    `AdminSettings` shape covers all 5 AI provider configs + defaults).
  - `lib/auth/index.ts` — no-op `getCurrentUser()` → `{id:'guest',
    role:'guest'}`. `lib/auth/passphraseSession.ts` +
    `lib/auth/guard.ts` — a signed-cookie session helper and
    `isAdminRequest(request)` check, **implemented but not wired into any
    route yet** (that's Phase 6 — gating `/settings` only, per the plan).
  - `lib/ai/types.ts` — the `AIProvider` interface, `AIProviderId` union
    (5 providers), chat/extract/testConnection shapes. **No provider
    adapters implemented yet** (`lib/ai/providers/` is empty).
  - `templates/types.ts` — `TemplateModule`/`TemplateMeta`/
    `ResumeTemplateProps` contracts. `templates/index.ts` — the registry,
    currently **empty** (no `exabyting` template built yet).
- Empty (created, unpopulated) directories ready for their phase:
  `lib/import/extractors/`, `lib/export/`, `components/editor/`,
  `components/settings/`, `components/common/`, `test/`, `e2e/`.
- `.env.example` documents `ADMIN_SETTINGS_PASSWORD` and `SESSION_SECRET`
  (both unset — needed once Phase 6's passphrase gate is wired up).
- Verified clean: `npx tsc --noEmit`, `npm run build`, `npm run lint`.

## What does NOT exist yet (this is the actual work)

Everything from **Phase 1 onward** in the plan is still to build:

1. **Phase 1 (do this next)** — the editor UI, the `exabyting` template
   (react-pdf `Document` + `tokens.ts` with **placeholder** brand
   colors/logo — the real Exabyting CSS tokens/logo have not been supplied
   yet, swapping them in later should be a `tokens.ts`-only change), and the
   live preview pane. This is the foundation everything else validates
   against — don't skip ahead to AI/import before this works end-to-end.
2. Phase 2 — PDF/PNG export (`lib/export/toPdfBlob.ts`,
   `toPngBlob.ts`), fully client-side, no API routes needed.
3. Phase 3 — Markdown/DOCX export (`toMarkdown.ts`, `toDocx.ts`).
4. Phase 4 — AI settings UI + the 5 `lib/ai/providers/*.ts` adapters +
   AI-assisted import (`/api/import/ai-parse` — the **only** server route
   needed for import) + the shared import review screen.
5. Phase 5 — non-AI heuristic import parsers (reuses Phase 4's review UI).
6. Phase 6 — wire up the passphrase gate (`lib/auth/guard.ts` already has
   the logic; it just needs a login route/page and to actually be called
   from `/settings` and `/api/settings/*`), `.json` project-file
   export/import, a second template to prove registry extensibility, a11y
   pass, Playwright smoke suite.

No tests have been written yet (`test/`, `e2e/` are empty).

## Open items the user still needs to supply / decide (don't block on all of them, but don't guess silently either)

- Real Exabyting resume-template CSS tokens/logo (referenced throughout the
  plan as "pending" — `templates/exabyting/tokens.ts` should ship with
  clearly-marked placeholders until these arrive).
- A licensed source for the Gilroy font (app-chrome display font).
- Whether Netlify's paid tier is available (affects nothing about the
  react-pdf approach directly, but is worth confirming before deploy).

## Recap of settled decisions (do not re-litigate without new information)

- No Puppeteer/headless-Chrome anywhere — PDF via `@react-pdf/renderer`,
  PNG via rasterizing that PDF with `pdfjs-dist`. Both run **client-side**.
  This was a deliberate switch from an earlier plan (see the decision log in
  the plan doc) after researching how Reactive Resume (the most popular OSS
  resume builder) itself moved off headless Chrome for the same reasons.
- ~~No database, no accounts~~ **Superseded 2026-09-07** — see the "Update"
  section at the top of `docs/plans/2026-09-07-resume-builder-plan.md`.
  Real email/password login (admin-provisioned) and Neon Postgres storage
  landed by changing implementations behind the existing `StorageAdapter`/
  auth interfaces exactly as this bullet anticipated, not by rewriting
  callers.
- Admin AI keys are shared for everyone, stored server-side via Netlify
  Blobs, entered through an in-app Settings page — never per-user, never in
  the browser.
- A4 default page size, optional headshot photo field, no Tailwind, plain
  CSS + CSS Modules-free co-located stylesheets for app chrome per
  `AGENTS.md`.

## A few environment gotchas discovered during setup (save yourself the time)

1. `create-next-app` refuses to scaffold into a non-empty directory — even a
   stray hidden dir counts. If you ever need to re-scaffold, do it in a
   scratch directory and merge files in rather than running it in place.
2. This machine's global `~/.npmrc` has an `allow-scripts` allowlist that
   breaks `create-next-app`'s own auto-install step (npm error
   `--allow-scripts is not allowed in project-scoped installs`). If you hit
   that, use `--skip-install` and run `npm install` manually afterward.
3. `@types/node@^20` (Next's default) conflicts with `vitest@5`'s peer dep
   (`^22 || >=24`) — already resolved by bumping to `@types/node@latest`
   in this repo; nothing to do, just don't downgrade it.
4. Base UI's current npm package is `@base-ui/react`, not
   `@base-ui-org/react` (an older/renamed identifier that appears in some
   docs) — already installed correctly here.

## Verification checklist for whoever picks this up

- `npm install` (fresh clone), `npm run dev` — confirm the placeholder home
  page loads.
- `npx tsc --noEmit`, `npm run build`, `npm run lint` — all currently pass;
  keep them passing.
- Once Phase 1 lands: create a resume, add/reorder sections, confirm the
  live preview matches the `exabyting` template, export a PDF and confirm
  real selectable text.
