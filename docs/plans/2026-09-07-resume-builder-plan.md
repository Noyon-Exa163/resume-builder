# Exabyting Resume Builder — Implementation Plan

## Update — 2026-09-07 (pivot: real auth + Neon Postgres)

The "no accounts, no database" decisions below (Context bullet 2 and the
"Recap of settled decisions" entry) are **superseded**. New direction,
decided by the user mid-Phase-1:

- **Auth is now real, not a no-op.** Custom email + password login (not
  Google OAuth). There is no self-serve signup — an admin creates accounts
  and sets each user's initial password (see `lib/auth/index.ts`,
  `lib/auth/userSession.ts`, `lib/auth/password.ts`).
- **Storage is now Neon Postgres, not IndexedDB-only.** Resumes are saved
  server-side, scoped to the logged-in user, who can list/edit/delete their
  own resumes. A Neon project **"Exabyting Resume Builder"** was created
  under the **"Zibon Exa"** org (via the Neon MCP tools — the `neon`/
  `neonctl` CLI isn't installed on this machine, so MCP was used to reach
  the same result the user asked for). Schema: `db/migrations/0001_init.sql`
  (`users`, `resumes` with a `jsonb` `data` column holding the full
  `ResumeData`). Connection string lives in `.env.local` /
  `DATABASE_URL` (see `.env.example`).
- `StorageAdapter<T>` (`lib/storage/types.ts`) is unchanged — the point of
  that abstraction was exactly this swap. IndexedDB code may be retired
  once the Postgres-backed adapter lands; check before deleting in case it
  ends up kept as an offline cache.
- New dependency: `@neondatabase/serverless` (HTTP-based driver, fits
  Netlify's serverless functions better than a persistent `pg` socket).

## Context

Exabyting needs an internal resume builder where the top priority is **company-branded design fidelity and PDF export quality**. It must be shareable with non-technical staff (fill out a form, no jargon), support importing existing resumes (PDF/DOCX/Markdown, with and without AI), export to PDF/PNG/Markdown/DOCX, let an admin configure shared AI API keys (Gemini, Anthropic, OpenRouter, DeepSeek, plus a generic OpenAI-compatible slot), and be code-extensible for future resume templates without needing a visual template builder.

This is a from-scratch build (repo was empty at project start). Key constraints locked in during planning:
- **Hosting**: Netlify, single Next.js (App Router, TypeScript) app for UI + backend.
- **Auth**: ~~none for now~~ **superseded, see "Update — 2026-09-07" above** — real email/password login, admin-provisioned accounts, Neon Postgres.
- **Design fidelity is non-negotiable for PDF/PNG**: rendering goes through `@react-pdf/renderer` (real PDF component tree, real vector/selectable text — matters for ATS parsing), not client-side canvas screenshotting of HTML. We evaluated a headless-Chrome (Puppeteer) approach and OSS alternatives (Reactive Resume, JSON Resume) before deciding — see "Architecture decision log" below.
- **Styling stack**: per the existing Exabyting **ExaDesign** system (`AGENTS.md`), the app chrome (editor/settings UI) uses **plain CSS with CSS custom properties, CSS Modules for scoping, no Tailwind**, Base UI for headless primitives, lucide-react icons. Resume *templates* are a separate concern styled with `@react-pdf/renderer`'s own `StyleSheet`/flexbox primitives (not CSS) — see Rendering Architecture below.

## Architecture decision log (for future reference)

- **Reactive Resume** (most popular OSS resume builder) was evaluated as a possible base and rejected: it's a NestJS + PostgreSQL + Docker/SeaweedFS full-stack app with its own accounts system and SCSS design system. Adopting it would mean ripping out most of its architecture to fit our Netlify/no-DB/no-auth/ExaDesign decisions — more effort than building fresh on our own stack while reusing individual OSS libraries (which we do throughout — see Package list).
- **JSON Resume** (community JSON-schema standard + 400+ themes) — not adopted as the core schema, but our schema is a superset of similar concepts (basics/work/education/skills); a JSON Resume import/export option is a cheap future nice-to-have (Phase 6+), not required for v1.
- **PDF/PNG rendering**: originally planned as server-side Puppeteer + `@sparticuz/chromium` on a Netlify Function. Superseded by `@react-pdf/renderer` after research showed Reactive Resume itself moved off headless Chrome to this approach in v5.1. Rationale for the switch:
  - Removes the biggest technical risk in the original plan (headless-Chromium bundle size / cold-start / timeout limits on Netlify Functions) entirely — there is no headless browser anywhere in the export path.
  - `@react-pdf/renderer` produces a real PDF from a React component tree (works client-side **and** server-side with the same API), so the exact same template component drives the live preview (via its `PDFViewer`/blob output) and the final export — still a single source of truth, still zero drift.
  - PNG export is derived by rasterizing the generated PDF via `pdfjs-dist` (already a planned dependency for PDF import) onto a `<canvas>` at 2–5x scale — also no headless browser needed.
  - Trade-off accepted: templates are authored with react-pdf's flexbox-only `View`/`Text`/`Image` primitives and a `StyleSheet.create()` object instead of arbitrary HTML/CSS — no CSS Grid, more limited gradients/shadows. This covers the vast majority of resume layouts (nearly all are flex-based already) and was an explicit, informed trade-off, not an oversight.
  - Consequence: **all four export formats (PDF, PNG, Markdown, DOCX) can run entirely client-side** — no export API routes, no `/print/[templateId]` route, no transient render-payload storage. The Next.js backend's only remaining job is the AI provider proxy and admin settings storage (both of which genuinely need a server to keep API keys off the client).
  - Similarly, **non-AI import text extraction** (`pdfjs-dist` for PDF, `mammoth` for DOCX — both have browser builds) can run entirely client-side too. Only the AI-assisted import path needs a server round trip, since it needs the admin-managed API key.

## First two execution steps (before any feature code)

1. **Save this plan** as `docs/plans/2026-09-07-resume-builder-plan.md` (done).
2. **Create `AGENTS.md`** at the repo root, adapted from the Exabyting ExaDesign reference (`/Users/exabyting/Documents/Work/Projects/Mosaic/1/Repo/incivia/AGENTS.md`):
   - Keep the **YAML frontmatter exactly as-is** (color palette, semantic tokens, spacing, radius, shadow, motion, typography) — these are the real ExaDesign brand tokens and govern the app UI.
   - Rewrite the markdown body's project-specific parts (tech-context line, file-structure example, pre-merge checklist) to reflect this project's actual stack instead of the generic example.
   - Add a short note distinguishing **app-chrome tokens** (`styles/tokens.css`, ExaDesign, CSS) from **resume-template styling** (`templates/exabyting/*`, `@react-pdf/renderer` `StyleSheet` objects, print-oriented, brand tokens supplied separately as JS constants rather than CSS variables since react-pdf can't consume CSS).

## Project structure

```
resume-builder/
  app/
    layout.tsx
    page.tsx                          # dashboard: "My resumes" (IndexedDB-backed list)
    editor/[resumeId]/page.tsx        # editor + live PDF preview pane (client-side @react-pdf/renderer)
    import/review/page.tsx            # shared review/confirm screen (AI + heuristic import)
    settings/
      page.tsx                        # template picker, AI provider keys, defaults
      login/page.tsx                  # temporary passphrase gate (Settings only)
    api/
      import/ai-parse/route.ts        # only server-side import path (needs admin AI key)
      ai/{test-connection,chat}/route.ts
      settings/{route.ts,login/route.ts,logout/route.ts}

  components/
    editor/  (SectionList, SectionCard, EntryList, EntryForm, PersonalInfoForm,
               SummaryForm, AddSectionMenu, LivePreviewPane, ExportButtons — dnd-kit reordering)
    settings/ (ProviderKeyField, TemplatePicker, PassphraseGate)
    common/ (SplitPane)

  templates/
    index.ts                          # registry: templateId -> TemplateModule
    types.ts                          # TemplateModule / TemplateMeta contracts (react-pdf Document component)
    exabyting/ (ExabytingDocument.tsx, tokens.ts, thumbnail.png, meta.ts)
                                       # tokens.ts: JS constants (react-pdf can't read CSS vars)

  lib/
    schema/resume.ts                  # Zod ResumeData — single source of truth
    storage/
      types.ts                        # StorageAdapter<T> interface
      indexeddb/ (db.ts via `idb`, resumeRepository.ts)   # resume data, client-side
      settings/ (types.ts, netlifyBlobsStore.ts)          # admin settings, server-side
    auth/ (index.ts no-op getCurrentUser(), guard.ts requireAdmin(), passphraseSession.ts)
    ai/
      types.ts                        # AIProvider interface
      providers/{gemini,anthropic,openrouter,deepseek,customOpenAICompatible}.ts
      registry.ts
      extractionPrompt.ts             # shared prompt + schema description
    import/ (detectFormat.ts, extractors/{pdfText,docxText,markdownText}.ts — all client-safe,
               heuristicParser.ts — client-side, aiParser.ts — calls /api/import/ai-parse)
    export/
      toMarkdown.ts                   # client-side string transform
      toDocx.ts                       # client-side, `docx` package Packer.toBlob()
      toPdfBlob.ts                    # client-side, @react-pdf/renderer pdf(<Doc/>).toBlob()
      toPngBlob.ts                    # client-side, rasterize the PDF blob via pdfjs-dist canvas render
    utils/ (ids.ts, dates.ts)

  styles/tokens.css   # ExaDesign app-chrome tokens (from AGENTS.md frontmatter) — app UI only
  styles/globals.css
  public/logo-exabyting.svg   # placeholder until real logo supplied

  e2e/ (editor.spec.ts, export-pdf.spec.ts)          # Playwright
  test/ (schema.test.ts, heuristicParser.test.ts, toMarkdown.test.ts)  # Vitest
```

## Package list

- Core: `next`, `react`, `react-dom`, `typescript`, `zod`
- Editor: `idb` (IndexedDB), `@dnd-kit/core` + `/sortable` + `/utilities`, `nanoid`, `zustand` (editor draft state)
- **Rendering/export**: `@react-pdf/renderer` (PDF component tree, client + server capable), `pdfjs-dist` (PDF text extraction on import **and** PNG rasterization of exported PDFs), `mammoth` (DOCX → text/HTML, client-safe), `docx` (DOCX writer, client-safe via `Packer.toBlob()`)
- Server storage: `@netlify/blobs` (admin settings KV)
- AI providers: **no vendor SDKs** — plain typed `fetch` wrappers for all 5 (Gemini's Generative Language API, Anthropic's Messages API, OpenRouter + DeepSeek + the custom slot are all OpenAI-compatible chat-completions shape).
- Styling: plain CSS + CSS Modules + CSS custom properties (ExaDesign tokens) for app chrome, **no Tailwind**; Base UI (`@base-ui-org/react`) for headless primitives; `lucide-react` for icons — per `AGENTS.md`. Templates use react-pdf's own styling system, not CSS.
- Testing: `vitest`, `@testing-library/react`, `@playwright/test`
- Misc: `date-fns` (date formatting in heuristic parser + templates)

**Removed from the original plan**: `puppeteer-core`, `@sparticuz/chromium` — no longer needed (see decision log).

## Core `ResumeData` schema (`lib/schema/resume.ts`)

```ts
export const EntrySchema = z.object({
  id: z.string(), title: z.string().default(""), subtitle: z.string().optional(),
  location: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional(),
  isCurrent: z.boolean().optional(), bullets: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]), description: z.string().optional(),
  link: z.string().url().optional().or(z.literal("")),
});

export const SectionKind = z.enum(["experience","education","skills","projects",
  "certifications","languages","awards","custom"]);

export const SectionSchema = z.object({
  id: z.string(), kind: SectionKind, title: z.string(), visible: z.boolean().default(true),
  layout: z.enum(["list","grid","tags"]).default("list"), entries: z.array(EntrySchema).default([]),
});

export const PersonalInfoSchema = z.object({
  fullName: z.string().default(""), headline: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")), phone: z.string().optional(),
  location: z.string().optional(), website: z.string().url().optional().or(z.literal("")),
  linkedin: z.string().optional(), github: z.string().optional(),
  photoDataUrl: z.string().optional(),   // optional headshot — confirmed in scope
});

export const ResumeDataSchema = z.object({
  schemaVersion: z.literal(1),
  meta: z.object({ id: z.string(), title: z.string().default("Untitled Resume"),
    createdAt: z.string(), updatedAt: z.string(), templateId: z.string().default("exabyting"),
    pageSize: z.enum(["A4","Letter"]).default("A4") }),   // A4 default, confirmed
  personalInfo: PersonalInfoSchema,
  summary: z.string().optional(),
  sections: z.array(SectionSchema).default([]),
});
```

`kind: "custom"` + free `title` covers arbitrary user-named sections without an `any` bag. `schemaVersion` is present from day one so IndexedDB records and exported `.json` project files can be migrated later. AI/heuristic parsers output `Partial<ResumeData>`; a shared `normalizeAndValidate()` fills ids/defaults before anything reaches the UI or gets saved.

## Template registry contract (react-pdf based)

```ts
// templates/types.ts
import type { ComponentType } from "react";
import type { ResumeData } from "@/lib/schema/resume";

export interface TemplateMeta { id: string; name: string; thumbnailSrc: string;
  pageSize: "A4" | "Letter"; description?: string; }
export interface ResumeTemplateProps { data: ResumeData; }
export interface TemplateModule {
  meta: TemplateMeta;
  Document: ComponentType<ResumeTemplateProps>;   // a react-pdf <Document><Page>...</Page></Document> root
}
```

`templates/index.ts` exports a `Record<string, TemplateModule>` registry + `getTemplate(id)`. Adding a future template = new folder under `templates/`, one registry entry — no builder UI needed.

**Single source of truth for rendering**: `LivePreviewPane.tsx` feeds the current draft `ResumeData` (debounced ~300-500ms while typing) into the template's `Document` component and displays it via `@react-pdf/renderer`'s `PDFViewer` (or `usePDF()` + an `<iframe>` over the resulting blob URL). The **export buttons** call the exact same `Document` component through `pdf(<Document data={data} />).toBlob()` — literally the same render, so there is no drift between what the user sees while editing and what they download. PNG export takes that same PDF blob, loads it with `pdfjs-dist`, renders page 1 to an off-screen `<canvas>` at the user's chosen scale (2–5x), and exports `canvas.toBlob('image/png')`.

`exabyting` template ships first, using placeholder brand tokens/logo (`templates/exabyting/tokens.ts`, plain JS constants — react-pdf styles can't read CSS custom properties) until the real values are supplied; swapping them in later is a one-file change.

## AI provider adapters (`lib/ai/`)

Common interface (`lib/ai/types.ts`): `extractResumeData(input, apiKey, model)`, `chat(input, apiKey, model)`, `testConnection(apiKey, model)`. Five adapters under `lib/ai/providers/`:

- `anthropic.ts` — Messages API, forced tool-call (`emit_resume_json`) for structured output.
- `gemini.ts` — Generative Language API, `generationConfig.responseMimeType: "application/json"` + `responseSchema`.
- `openrouter.ts` / `deepseek.ts` — OpenAI-compatible chat-completions, `response_format: { type: "json_object" }`.
- `customOpenAICompatible.ts` — same OpenAI-compatible shape, user supplies base URL + API key + model name in Settings (confirmed in scope).

All extraction calls go through one shared prompt/schema builder (`extractionPrompt.ts`) so providers differ only in transport, not in what they're asked for. On Zod validation failure, retry once with the validation error appended to the prompt, then surface a clear error to the review UI rather than crashing.

## Import pipeline (PDF / DOCX / Markdown — symmetric, mostly client-side)

1. **Detect format** by extension/MIME (client-side).
2. **Extract text** (client-side, no upload needed unless AI path is chosen): PDF via `pdfjs-dist`; DOCX via `mammoth` (`convertToHtml` so heading styles help the heuristic parser find section boundaries); Markdown read as-is.
3. **User picks a path**: "Quick parse (free, no AI)" → `heuristicParser.ts` runs entirely client-side (keyword section headers, email/phone/date-range regex, bullet-marker splitting; unmatched lines land in a catch-all section rather than being dropped) — **or** "AI-assisted parse" → extracted text + user's editable instruction sent to `POST /api/import/ai-parse` (the only server hop in this pipeline, required because the AI key is admin-managed).
4. Both paths funnel through `normalizeAndValidate()` into one `ResumeData` shape.
5. **Review & confirm screen** (`app/import/review/page.tsx`) reuses the editor's own `SectionCard`/`EntryForm` components, pre-filled, with a confidence/source banner, before committing to IndexedDB. Nothing is auto-saved without the user seeing and being able to correct it first.

## Export pipeline (fully client-side)

- **PDF**: export button → `lib/export/toPdfBlob.ts` → `pdf(<Document data={data} />).toBlob()` (same `Document` component as the live preview) → trigger browser download. Real vector/selectable text.
- **PNG**: `lib/export/toPngBlob.ts` → get the PDF blob from the step above → `pdfjs-dist` renders it to an off-screen `<canvas>` at 2–5x scale → `canvas.toBlob('image/png')` → download.
- **Markdown**: `toMarkdown.ts` walks `ResumeData` directly (header, `## Summary`, `## {section}`, bold title/subtitle lines, bullet lists) — pure string transform, no design fidelity needed (per original scope).
- **DOCX**: `toDocx.ts` builds a `docx` `Document` mirroring the same section walk, `Packer.toBlob()` — explicitly documented as best-effort formatting, not a branded-template replica.

No export API routes exist — everything above runs in the browser.

## Phased build order

0. **Scaffolding** — `create-next-app` (TS/App Router), ESLint/Prettier, Vitest + Playwright, `netlify.toml`, empty schema/template/storage/auth interfaces, a working "hello world" Netlify deploy. Docs/AGENTS.md steps happen here too.
1. **Data model + editor + Exabyting template + live preview** — the foundation everything else validates against. Since export is now just "call the same template component differently," this phase also de-risks export much earlier than the original plan did.
2. **PDF/PNG export** — `toPdfBlob.ts`/`toPngBlob.ts`, export buttons in the editor. Still prioritized early since design/export fidelity is the top priority, but now low-risk (no serverless-Chromium infra to get working).
3. **Markdown/DOCX export** — pure data transforms, low risk, quick once schema is stable.
4. **AI settings + AI-assisted import** — Netlify Blobs settings store, Settings UI (5 provider slots, test-connection, defaults, template picker), the 5 adapters, `aiParser.ts`, `/api/import/ai-parse`, import review screen.
5. **Non-AI heuristic import parsers** — reuses the review-UI/normalization plumbing built in phase 4, so it comes after.
6. **Polish** — `ADMIN_SETTINGS_PASSWORD` passphrase gate on `/settings` + `/api/settings/*` only (confirmed scope), `.json` project-file export/import for backup/transfer between devices, error boundaries around AI/parse failures, a second minimal template to prove registry extensibility, accessibility pass, Playwright smoke suite. Optional: JSON Resume import/export interoperability.

## Known risks / assumptions to watch during build

- react-pdf's flexbox-only layout model needs to genuinely reproduce the real Exabyting brand template once tokens/logo arrive — flag early if the real design needs CSS Grid or effects react-pdf can't express; a hybrid fallback (react-pdf for PDF/PNG, a separate HTML/CSS component only for on-screen preview) remains possible but would reintroduce drift risk and should be avoided unless truly necessary.
- `PDFViewer` live-preview re-renders the whole PDF on data change — debounce input-driven updates (~300-500ms) so typing doesn't feel janky.
- IndexedDB quota is generous but browser-dependent; the `.json` export/import is the only cross-device backup mechanism until real accounts/DB land.
- Real Exabyting resume-template tokens/logo are still pending from the user — `exabyting` template ships with placeholders first, swapped in later as a tokens.ts-only change.

## Verification

- `npm run dev` locally; manually create a resume, add/remove/reorder sections and entries, confirm live PDF preview matches expectations.
- Export PDF, confirm real selectable/searchable text and correct A4 layout. Export PNG at 2x and 5x, confirm sharpness. Export Markdown and DOCX, confirm readable formatting.
- `netlify dev` (or a deploy preview) to exercise the AI proxy + settings routes (the only server-dependent features).
- Import a sample PDF/DOCX/Markdown resume through both the heuristic and AI-assisted paths (once Phase 4/5 land), confirm the review screen lets you correct mistakes before saving.
- `npm run test` (Vitest: schema, heuristic parser, markdown formatter) and `npx playwright test` (editor smoke test, export-PDF smoke test) passing.
