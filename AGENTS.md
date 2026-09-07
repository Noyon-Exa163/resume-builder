---
name: "Exabyting Design System — ExaDesign"
version: "1.0"
theme: "exadesign"
brand-color: "#0072ED"
font-display: "Gilroy"
font-body: "Inter"
font-mono: "JetBrains Mono"

# ── Raw color palette (11 perceptual OKLCH steps per palette) ─────────────────
- Step 5 is the anchor. Steps 1–4 are tints (lightest → anchor).
- Steps 6–11 are shades (anchor → darkest).
- Components MUST use semantic tokens, not raw steps.


colors:
  exa:
    "1": "#f0f5fe"
    "2": "#d7e5fd"
    "3": "#acccff"
    "4": "#64a5ff"
    "5": "#0072ED"   # anchor — primary brand blue
    "6": "#0058d7"
    "7": "#0043b8"
    "8": "#003291"
    "9": "#032468"
    "10": "#031643"
    "11": "#020823"
  neutral:
    "1": "#f6f7f8"
    "2": "#e8ecef"
    "3": "#d6dbe3"
    "4": "#bbc5d1"
    "5": "#8697ad"
    "6": "#61738d"
    "7": "#45556c"
    "8": "#314157"
    "9": "#1c283c"
    "10": "#0d1529"
    "11": "#010515"
  grey:
    "1": "#ffffff"
    "2": "#fcfcfc"
    "3": "#f7f7f7"
    "4": "#f2f2f2"
    "5": "#e4e4e4"
    "6": "#d4d4d4"
    "7": "#bababa"
    "8": "#989898"
    "9": "#717171"
    "10": "#4a4a4a"
    "11": "#222222"
  red:
    "1": "#fef2f2"
    "2": "#ffe2e2"
    "3": "#ffc7c7"
    "4": "#fc9c9a"
    "5": "#fb2c36"   # anchor — danger
    "6": "#e6000d"
    "7": "#c00006"
    "8": "#9a000b"
    "9": "#7a0b11"
    "10": "#540a0c"
    "11": "#320606"
  orange:
    "1": "#fff7ed"
    "2": "#feecd3"
    "3": "#ffd6a5"
    "4": "#ffb566"
    "5": "#ff6900"   # anchor
    "6": "#f54900"
    "7": "#c93300"
    "8": "#a02c00"
    "9": "#7c2809"
    "10": "#501a07"
    "11": "#300e06"
  yellow:
    "1": "#fefce8"
    "2": "#fef9c2"
    "3": "#fef084"
    "4": "#fdde31"
    "5": "#f6ba00"   # anchor — warning
    "6": "#df9300"
    "7": "#b26500"
    "8": "#904d00"
    "9": "#753c00"
    "10": "#4f2703"
    "11": "#321705"
  green:
    "1": "#f0fdf4"
    "2": "#dbfce7"
    "3": "#b9f8cf"
    "4": "#7cf1a6"
    "5": "#00c950"   # anchor — success
    "6": "#00a53c"
    "7": "#008135"
    "8": "#02652f"
    "9": "#095027"
    "10": "#043218"
    "11": "#031c0b"
  cyan:
    "1": "#ecfeff"
    "2": "#cefafe"
    "3": "#a2f3fc"
    "4": "#51e8fb"
    "5": "#00b8db"   # anchor
    "6": "#0091b7"
    "7": "#007595"
    "8": "#005f78"
    "9": "#0f4d63"
    "10": "#053344"
    "11": "#051e29"
  mint:
    "1": "#f0fdfa"
    "2": "#cbfbf1"
    "3": "#95f7e5"
    "4": "#47ecd4"
    "5": "#00bba7"   # anchor
    "6": "#009689"
    "7": "#00776e"
    "8": "#005f59"
    "9": "#0b4e4a"
    "10": "#043331"
    "11": "#031d1d"
  indigo:
    "1": "#eef2ff"
    "2": "#e0e7ff"
    "3": "#c6d2ff"
    "4": "#a2b3ff"
    "5": "#615fff"   # anchor
    "6": "#4f39f6"
    "7": "#432cd7"
    "8": "#3628ab"
    "9": "#302b84"
    "10": "#201c54"
    "11": "#100e2f"
  purple:
    "1": "#faf5ff"
    "2": "#f3e8ff"
    "3": "#ead4ff"
    "4": "#d9b1ff"
    "5": "#ad46ff"   # anchor
    "6": "#970efa"
    "7": "#8200da"
    "8": "#6d0faf"
    "9": "#59178a"
    "10": "#3c0266"
    "11": "#230140"
  black: "#000000"
  white: "#ffffff"

# ── Semantic color tokens (ExaDesign theme defaults) ──────────────────────────
# These are the values components and custom CSS MUST use.
semantic-colors:
  brand:
    default: "#0072ED"      # exa.5
    hover: "#0058d7"        # exa.6
    active: "#0043b8"       # exa.7
    subtle: "#d7e5fd"       # exa.2
    muted: "#d7e5fd"        # exa.2
    light: "#acccff"        # exa.3
  success:
    default: "#00c950"      # green.5
    subtle: "#f0fdf4"       # green.1
    text: "#095027"         # green.9
  danger:
    default: "#fb2c36"      # red.5
    subtle: "#fef2f2"       # red.1
    text: "#7a0b11"         # red.9
  warning:
    default: "#f6ba00"      # yellow.5
    subtle: "#fefce8"       # yellow.1
    text: "#753c00"         # yellow.9
  info:
    default: "#0072ED"      # exa.5
    subtle: "#f0f5fe"       # exa.1
    text: "#032468"         # exa.9
  surface:
    bg: "#f2f2f2"           # grey.4 — page background
    default: "#ffffff"      # grey.1 — card, panel
    raised: "#ffffff"       # grey.1 — elevated card
    inset: "#f7f7f7"        # grey.3 — inset / nested surface
    overlay: "rgba(7,12,17,0.48)"
  border:
    default: "#e4e4e4"      # grey.5
    strong: "#bababa"       # grey.7
    focus: "#0072ED"        # brand default
  text:
    primary: "#010515"      # neutral.11
    secondary: "#45556c"    # neutral.7
    tertiary: "#8697ad"     # neutral.5
    disabled: "#bbc5d1"     # neutral.4
    on-brand: "#ffffff"
    on-dark: "#ffffff"
    inverse: "#ffffff"
  link:
    default: "#0058d7"      # exa.6
    hover: "#0043b8"        # exa.7
  chart:
    brand: "#0072ED"
    blue: "#0058d7"
    green: "#00c950"
    orange: "#ff6900"
    purple: "#ad46ff"
    cyan: "#00b8db"
    yellow: "#f6ba00"
    mint: "#00bba7"

# ── Dark mode overrides ───────────────────────────────────────────────────────
# Applied via the `.dark` class on <html>.
dark-mode-overrides:
  surface:
    bg: "oklch(10% 0.018 265)"
    default: "oklch(14% 0.022 265)"
    raised: "oklch(17% 0.025 265)"
    inset: "#0d1529"
    overlay: "rgba(0,0,0,0.65)"
  border:
    default: "#1c283c"
    strong: "#45556c"
  text:
    primary: "#ffffff"
    secondary: "#bbc5d1"
    tertiary: "#61738d"
    disabled: "#314157"
  brand-subtle: "#020823"
  brand-muted: "#031643"
  brand-light: "#032468"

# ── Spacing (4px base scale) ──────────────────────────────────────────────────
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "7": "28px"
  "8": "32px"
  "9": "36px"
  "10": "40px"
  "11": "44px"
  "12": "48px"
  "14": "56px"
  "16": "64px"
  "20": "80px"
  "24": "96px"

# ── Border radius ─────────────────────────────────────────────────────────────
radius:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "20px"
  full: "9999px"

# ── Elevation / Shadow ────────────────────────────────────────────────────────
shadow:
  "1": "0 1px 2px 0 rgba(7,12,17,0.06)"
  "2": "0 2px 6px 0 rgba(7,12,17,0.08), 0 1px 2px 0 rgba(7,12,17,0.06)"
  "3": "0 4px 16px 0 rgba(7,12,17,0.10), 0 2px 4px 0 rgba(7,12,17,0.06)"
  "4": "0 8px 32px 0 rgba(7,12,17,0.14), 0 2px 8px 0 rgba(7,12,17,0.08)"

# ── Motion ────────────────────────────────────────────────────────────────────
motion:
  duration:
    fast: "100ms"
    base: "150ms"
    slow: "250ms"
    slower: "1s"
    ripple-exit: "0.5s"
  easing:
    default: "cubic-bezier(0.4, 0, 0.2, 1)"
    in: "cubic-bezier(0.4, 0, 1, 1)"
    out: "cubic-bezier(0, 0, 0.2, 1)"
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)"

# ── Typography ────────────────────────────────────────────────────────────────
typography:
  font-family:
    display: "Gilroy"
    body: "Inter"
    mono: "JetBrains Mono"
  font-weight:
    regular: 400
    medium: 500
    semibold: 600
    bold: 700
    display: 700
  tracking:
    display: "-0.02em"
    title: "-0.015em"
    heading: "-0.01em"
    subtitle: "-0.005em"
    none: "0"
    overline: "0.08em"
    mono: "0.02em"
  leading:
    display: "1.1"
    title: "1.2"
    heading: "1.3"
    snug: "1.25"
    ui: "1.4"
    body: "1.57"
    caption: "1.4"
  text-styles:
    display-xl:  { size: "64px", weight: 700, lineHeight: "1.08", letterSpacing: "-0.022em", family: "display" }
    display-l:   { size: "48px", weight: 700, lineHeight: "1.10", letterSpacing: "-0.02em",  family: "display" }
    display-m:   { size: "40px", weight: 700, lineHeight: "1.10", letterSpacing: "-0.02em",  family: "display" }
    display-s:   { size: "32px", weight: 700, lineHeight: "1.15", letterSpacing: "-0.015em", family: "display" }
    h1:          { size: "32px", weight: 700, lineHeight: "1.20", letterSpacing: "-0.015em", family: "display" }
    h2:          { size: "28px", weight: 700, lineHeight: "1.20", letterSpacing: "-0.01em",  family: "display" }
    h3:          { size: "24px", weight: 700, lineHeight: "1.25", letterSpacing: "-0.01em",  family: "display" }
    h4:          { size: "20px", weight: 700, lineHeight: "1.30", letterSpacing: "-0.005em", family: "display" }
    h5:          { size: "18px", weight: 600, lineHeight: "1.35", letterSpacing: "0",        family: "display" }
    h6:          { size: "16px", weight: 600, lineHeight: "1.40", letterSpacing: "0",        family: "display" }
    body-l:      { size: "16px", weight: 400, lineHeight: "1.60", letterSpacing: "0",        family: "body" }
    body-m:      { size: "14px", weight: 400, lineHeight: "1.57", letterSpacing: "0",        family: "body" }
    body-s:      { size: "13px", weight: 400, lineHeight: "1.54", letterSpacing: "0",        family: "body" }
    label-l:     { size: "16px", weight: 500, lineHeight: "1.25", letterSpacing: "0",        family: "body" }
    label-m:     { size: "14px", weight: 500, lineHeight: "1.25", letterSpacing: "0",        family: "body" }
    label-s:     { size: "13px", weight: 500, lineHeight: "1.25", letterSpacing: "0",        family: "body" }
    caption:     { size: "12px", weight: 500, lineHeight: "1.40", letterSpacing: "0",        family: "body" }
    overline:    { size: "11px", weight: 600, lineHeight: "1.40", letterSpacing: "0.08em",   family: "body", transform: "uppercase" }
    mono:        { size: "13px", weight: 500, lineHeight: "1.50", letterSpacing: "0.02em",   family: "mono" }
    mono-s:      { size: "11px", weight: 500, lineHeight: "1.40", letterSpacing: "0.02em",   family: "mono" }
---

# AGENTS.md — Exabyting Resume Builder Engineering & Design Guide

> **For AI agents and developers:** This is the single source of truth for how
> to write modular, maintainable code **and** how to build UI for this project
> using the ExaDesign design system. Read it fully before writing or
> reviewing code, and keep it as a standing reference. Do not invent spacing,
> color, radius, shadow, or typography values — all design values live here.

Code is read far more often than it's written. Every shortcut taken today is a
tax someone (often future-you) pays later. The goal of everything below is
simple: **make change cheap and safe.** Modularity and a shared design system
are the two biggest levers for that.

**A note specific to this project — two token systems, not one:**

- **App-chrome tokens** (`styles/tokens.css`, generated from the YAML
  frontmatter above) govern the editor, settings, and dashboard UI — the
  "app" someone uses to build a resume. These are real CSS custom properties,
  consumed exactly as described in §6 below.
- **Resume-template styling** (`templates/*/tokens.ts`, `templates/*/*Document.tsx`)
  governs the actual resume *document* people export — a completely separate
  concern with its own brand tokens (Exabyting logo/colors for the printed
  resume, not necessarily identical to the app-chrome palette) supplied as
  plain JS constants, because resume templates are built with
  `@react-pdf/renderer`'s `View`/`Text`/`StyleSheet` primitives, which cannot
  read CSS custom properties. **Never import `styles/tokens.css` into a
  template, and never hand-write raw hex values into app-chrome components —
  each half of the app has exactly one place its values may come from.**

---

## 1. Core Principles of Modular Code

### 1.1 Single Responsibility Principle (SRP)
Every module, function, or component should do **one thing** and have **one
reason to change**.

- ❌ A service that handles resume storage, AI calls, and PDF export.
- ✅ Separate `lib/storage/*`, `lib/ai/*`, `lib/export/*`.

Ask yourself: *"If I had to describe what this file does, could I do it in one sentence without using 'and'?"*

### 1.2 Separation of Concerns
Keep distinct layers distinct:

| Layer | Responsibility | Where it lives here |
|---|---|---|
| **Presentation** | How things look/render | `components/`, `templates/` |
| **Business logic** | Rules and decisions | `lib/import/`, `lib/export/`, `lib/ai/` |
| **Data access** | Talking to storage, APIs | `lib/storage/`, `app/api/` |

Mixing these (e.g., calling an AI provider directly from a form component) makes both harder to test and reuse.

### 1.3 DRY — But Not Dogmatically
"Don't Repeat Yourself" prevents logic drift (fixing a bug in one copy but not the other). But don't abstract too early — **duplication is cheaper than the wrong abstraction.** A good rule of thumb: the third time you copy-paste something, that's when you extract it. UI components are an exception — see §6.1's "reuse first" rule, which applies at the *second* use.

### 1.4 Composition Over Inheritance
Prefer building behavior by combining small, focused pieces (hooks, small functions, the `AIProvider`/`StorageAdapter`/`TemplateModule` interfaces already defined in this codebase) rather than deep inheritance chains.

### 1.5 High Cohesion, Low Coupling
- **Cohesion** = things that belong together are grouped together.
- **Coupling** = modules depend on each other as little as possible.

A good module can be **understood, tested, and replaced in isolation**. This is the entire point of the `StorageAdapter`, `AIProvider`, and `TemplateModule` interfaces in this codebase — each lets its implementation be swapped (e.g. IndexedDB → a real DB later, or one AI provider → another) without touching the code that calls it.

### 1.6 Depend on Interfaces, Not Implementations
Code against `lib/storage/types.ts`, `lib/ai/types.ts`, and `templates/types.ts` — never reach into a specific implementation (e.g. `netlifyBlobsStore.ts`) from UI code. This is what lets a real database or a new AI provider slot in later without rewriting the editor or settings UI.

---

## 2. Structuring the Codebase

### 2.1 Organize by Feature/Layer, Not by File Type Alone
This project's top-level layout already reflects this: `lib/schema`, `lib/storage`, `lib/ai`, `lib/import`, `lib/export`, `lib/auth` each own one concern end-to-end. Within `components/`, group by feature area (`editor/`, `settings/`, `common/`) rather than a flat pile of files.

### 2.2 Define Clear Public Interfaces
Every `lib/*` module should expose a small, deliberate public surface — prefer a single well-named export (or an `index.ts` re-export) over reaching into internal files from outside the module. Internal helpers stay internal.

### 2.3 Avoid Circular Dependencies
`lib/schema` should never import from `lib/ai`, `lib/import`, or `templates` — it is the shared foundation everything else depends on, not the other way around.

### 2.4 Keep Functions and Files Small
Rough guidelines (not laws):
- Functions: under ~30–40 lines — if longer, ask if it's doing more than one thing.
- Files: if it's hard to scroll and hold the whole thing in your head, split it.

### 2.5 Co-locate Styles with Modules (app-chrome only)
Every feature component in `components/` ships a **sibling stylesheet** imported by its entry file. Styles live next to the code they style — not in a global grab-bag.

```
/components/editor
  SectionCard.tsx
  SectionCard.css      ← layout, states, and module-specific selectors
/components/ui
  Button.tsx
  Button.css
/styles
  tokens.css         ← ExaDesign tokens only (:root + .dark overrides)
  globals.css        ← reset, base typography, @import tokens.css
```

**Rules:**
- Import the sibling `.css` file at the top of the matching `.tsx` file.
- Use a single root class per component (e.g. `.section-card`) and nest modifiers with standard CSS (`.section-card--dragging`, `.section-card__title`).
- **Global stylesheets are for tokens and resets only.** Do not add feature- or page-specific rules to `globals.css`.
- Components reference **semantic tokens** (`var(--color-brand)`, `var(--space-4)`) — never raw palette steps or arbitrary values.
- **No Tailwind utility classes.** No inline `style={{ ... }}` except for truly dynamic runtime values.
- This section governs `components/`, `app/`, and `styles/` only — **not** `templates/`, which uses react-pdf's `StyleSheet.create()` co-located with each template's `Document` component instead (same "co-locate, don't scatter" spirit, different mechanism because it's not CSS).

---

## 3. Naming Conventions

Good names are a form of documentation.

- Be specific: `getResumeById` not `get`.
- Booleans read like yes/no questions: `isLoading`, `hasError`, `canEdit`.
- Avoid abbreviations only you understand.
- Be consistent project-wide — pick `fetch` or `get`, not both, for the same kind of operation.

---

## 4. Testing Modular Code

- **Unit tests** (`test/`, Vitest) for the schema, heuristic parser, export formatters, and template registry shape.
- **E2E tests** (`e2e/`, Playwright) for the golden path: create a resume, edit sections, export a PDF, confirm it downloaded.
- Mock external dependencies (AI providers, storage) at the interface boundary (`AIProvider`, `StorageAdapter`) — this is only easy if those interfaces stay clean (see §1.6).
- A good sign of poor modularity: needing to spin up the whole app to test one function.

---

## 5. Version Control & Review Habits

- **Small, focused commits** — one logical change per commit, with a clear message.
- **Small PRs** — easier to review thoroughly, easier to revert if something breaks.
- Write PR descriptions that explain *why*, not just *what* (the diff already shows what).
- Review for design-system and modularity violations too, not just bugs: "should this really bypass the storage/AI interface?"

---

## 6. Design System — ExaDesign (app chrome only)

A **design system** is the shared source of truth for how a product looks,
feels, and behaves. **ExaDesign** governs the app chrome of this project —
the dashboard, editor, and settings screens — via reusable components,
tokens, and rules, so those screens stay visually consistent and don't
reinvent buttons, spacing, or color choices per page. It does **not** govern
the resume templates themselves (see the note at the top of this file).

### 6.1 Design Principles

1. **Token-first.** Every color, spacing value, radius, and shadow in app-chrome code must come from a design token. No arbitrary hex values or magic numbers in component code.
2. **Semantic over primitive.** Use semantic aliases (`--color-brand`, `--color-text-primary`, `--space-4`) in components. Reserve raw palette steps (`--exa-5`, `--green-9`) for token source files only — this project has no data-viz surface yet, but the rule still applies if one is added.
3. **Consistency over novelty, reuse first.** Always check for an existing component before writing new markup/styles — no ad hoc, hard-coded one-off components unless nothing in the system meets the need. If a piece of UI is used more than once, extract it into a reusable component rather than copy-pasting it — for UI, the *second* use is the signal to extract.
4. **Accessibility first.** Every interactive element must be keyboard-accessible, have a visible focus ring (`--color-border-focus`), and meet WCAG 2.1 AA contrast ratios. This matters especially here since the editor must be usable by non-technical staff.
5. **Light-mode default, dark-mode ready.** Semantic tokens automatically resolve correctly in dark mode — no additional class juggling required in component code.
6. **Borders are a last resort.** Avoid `--color-border` unless a border is genuinely necessary — prefer spacing, surface contrast (`--color-surface` vs. `--color-surface-inset`), or shadow to separate content instead.

Component hierarchy follows Atomic Design: **Primitives/Atoms** (Button, Input, Icon, Text) → **Molecules** (SectionCard, EntryForm field group) → **Organisms** (SectionList, LivePreviewPane, Settings panel) → **Pages** (editor, settings, dashboard). Build from the bottom up, and prefer **variants over copies**.

### 6.2 Technology Context

- **Framework:** Next.js (App Router), TypeScript, deployed on Netlify.
- **Styling (app chrome):** Plain CSS with CSS custom properties (design tokens). **No Tailwind.** Each component has its own co-located `.css` file (see §2.5). Global CSS is limited to `tokens.css` (token definitions) and `globals.css` (reset + base typography).
- **Styling (resume templates):** `@react-pdf/renderer` `StyleSheet.create()` objects, values sourced from `templates/<id>/tokens.ts` — a completely separate system, not CSS. See the note at the top of this file.
- **Tokens:** Generate `styles/tokens.css` from this file's YAML frontmatter. Only the raw exa blue palette uses the `--exa-1`–`--exa-11` prefix; all other tokens are unprefixed (e.g. `--color-brand`, `--radius-md`).
- **Icons:** `lucide-react`.
- **Component primitives:** Base UI (`@base-ui-org/react`) for headless behaviour.
- **State:** `zustand` for editor draft state; `idb` for IndexedDB persistence of resumes; `@netlify/blobs` for server-side admin settings.
- **Data model:** `lib/schema/resume.ts` (Zod) is the single source of truth consumed by the editor, every template, every export formatter, and both import paths (heuristic and AI).

#### Token Generation Pattern

`styles/tokens.css` exposes all design tokens as CSS custom properties on `:root`:

```css
:root {
  /* ── Raw palette (token source only) ── */
  --exa-1: #f0f5fe;  --exa-2: #d7e5fd;  --exa-3: #acccff;  --exa-4: #64a5ff;
  --exa-5: #0072ED;  --exa-6: #0058d7;  --exa-7: #0043b8;  --exa-8: #003291;
  --exa-9: #032468;  --exa-10: #031643; --exa-11: #020823;

  --neutral-1: #f6f7f8; --neutral-2: #e8ecef; --neutral-3: #d6dbe3; --neutral-4: #bbc5d1;
  --neutral-5: #8697ad; --neutral-6: #61738d; --neutral-7: #45556c; --neutral-8: #314157;
  --neutral-9: #1c283c; --neutral-10: #0d1529; --neutral-11: #010515;

  --grey-1: #ffffff; --grey-2: #fcfcfc; --grey-3: #f7f7f7; --grey-4: #f2f2f2;
  --grey-5: #e4e4e4; --grey-6: #d4d4d4; --grey-7: #bababa; --grey-8: #989898;
  --grey-9: #717171; --grey-10: #4a4a4a; --grey-11: #222222;

  --red-1: #fef2f2;   --red-5: #fb2c36;   --red-9:  #7a0b11;  --red-11: #320606;
  --red-2: #ffe2e2;   --red-6: #e6000d;   --red-10: #540a0c;
  --red-3: #ffc7c7;   --red-7: #c00006;
  --red-4: #fc9c9a;   --red-8: #9a000b;

  --orange-1: #fff7ed;  --orange-5: #ff6900;  --orange-9:  #7c2809;  --orange-11: #300e06;
  --orange-2: #feecd3;  --orange-6: #f54900;  --orange-10: #501a07;
  --orange-3: #ffd6a5;  --orange-7: #c93300;
  --orange-4: #ffb566;  --orange-8: #a02c00;

  --ylw-1: #fefce8;  --ylw-5: #f6ba00;  --ylw-9:  #753c00;  --ylw-11: #321705;
  --ylw-2: #fef9c2;  --ylw-6: #df9300;  --ylw-10: #4f2703;
  --ylw-3: #fef084;  --ylw-7: #b26500;
  --ylw-4: #fdde31;  --ylw-8: #904d00;

  --green-1: #f0fdf4;  --green-5: #00c950;  --green-9:  #095027;  --green-11: #031c0b;
  --green-2: #dbfce7;  --green-6: #00a53c;  --green-10: #043218;
  --green-3: #b9f8cf;  --green-7: #008135;
  --green-4: #7cf1a6;  --green-8: #02652f;

  --cyan-1: #ecfeff;  --cyan-5: #00b8db;  --cyan-9:  #0f4d63;  --cyan-11: #051e29;
  --cyan-2: #cefafe;  --cyan-6: #0091b7;  --cyan-10: #053344;
  --cyan-3: #a2f3fc;  --cyan-7: #007595;
  --cyan-4: #51e8fb;  --cyan-8: #005f78;

  --mint-1: #f0fdfa;  --mint-5: #00bba7;  --mint-9:  #0b4e4a;  --mint-11: #031d1d;
  --mint-2: #cbfbf1;  --mint-6: #009689;  --mint-10: #043331;
  --mint-3: #95f7e5;  --mint-7: #00776e;
  --mint-4: #47ecd4;  --mint-8: #005f59;

  --indigo-1: #eef2ff;  --indigo-5: #615fff;  --indigo-9:  #302b84;  --indigo-11: #100e2f;
  --indigo-2: #e0e7ff;  --indigo-6: #4f39f6;  --indigo-10: #201c54;
  --indigo-3: #c6d2ff;  --indigo-7: #432cd7;
  --indigo-4: #a2b3ff;  --indigo-8: #3628ab;

  --purple-1: #faf5ff;  --purple-5: #ad46ff;  --purple-9:  #59178a;  --purple-11: #230140;
  --purple-2: #f3e8ff;  --purple-6: #970efa;  --purple-10: #3c0266;
  --purple-3: #ead4ff;  --purple-7: #8200da;
  --purple-4: #d9b1ff;  --purple-8: #6d0faf;

  --black: #000000;
  --white: #ffffff;

  /* ── Semantic tokens — components reference ONLY these ── */
  --color-brand:        var(--exa-5);
  --color-brand-hover:  var(--exa-6);
  --color-brand-active: var(--exa-7);
  --color-brand-subtle: var(--exa-2);
  --color-brand-muted:  var(--exa-2);
  --color-brand-light:  var(--exa-3);

  --color-success:        var(--green-5);
  --color-success-subtle: var(--green-1);
  --color-success-text:   var(--green-9);
  --color-danger:         var(--red-5);
  --color-danger-subtle:  var(--red-1);
  --color-danger-text:    var(--red-9);
  --color-warning:        var(--ylw-5);
  --color-warning-subtle: var(--ylw-1);
  --color-warning-text:   var(--ylw-9);
  --color-info:           var(--exa-5);
  --color-info-subtle:    var(--exa-1);
  --color-info-text:      var(--exa-9);

  --color-bg:              var(--grey-4);
  --color-surface:         var(--grey-1);
  --color-surface-raised:  var(--grey-1);
  --color-surface-inset:   var(--grey-3);
  --color-surface-overlay: rgba(7, 12, 17, 0.48);

  --color-border:        var(--grey-5);
  --color-border-strong: var(--grey-7);
  --color-border-focus:  var(--color-brand);

  --color-text-primary:   var(--neutral-11);
  --color-text-secondary: var(--neutral-7);
  --color-text-tertiary:  var(--neutral-5);
  --color-text-disabled:  var(--neutral-4);
  --color-text-on-brand:  #ffffff;
  --color-text-on-dark:   #ffffff;
  --color-text-inverse:   var(--grey-1);

  --color-link:       var(--exa-6);
  --color-link-hover: var(--exa-7);

  --chart-brand:  var(--color-brand);
  --chart-blue:   var(--exa-6);
  --chart-green:  var(--green-5);
  --chart-orange: var(--orange-5);
  --chart-purple: var(--purple-5);
  --chart-cyan:   var(--cyan-5);
  --chart-yellow: var(--ylw-5);
  --chart-mint:   var(--mint-5);

  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-5: 20px;  --space-6: 24px;  --space-7: 28px;  --space-8: 32px;
  --space-9: 36px;  --space-10: 40px; --space-11: 44px; --space-12: 48px;
  --space-14: 56px; --space-16: 64px; --space-20: 80px; --space-24: 96px;

  --radius-xs: 4px;  --radius-sm: 6px;  --radius-md: 8px;  --radius-lg: 12px;
  --radius-xl: 16px; --radius-2xl: 20px; --radius-full: 9999px;

  --shadow-1: 0 1px 2px 0 rgba(7, 12, 17, 0.06);
  --shadow-2: 0 2px 6px 0 rgba(7, 12, 17, 0.08), 0 1px 2px 0 rgba(7, 12, 17, 0.06);
  --shadow-3: 0 4px 16px 0 rgba(7, 12, 17, 0.10), 0 2px 4px 0 rgba(7, 12, 17, 0.06);
  --shadow-4: 0 8px 32px 0 rgba(7, 12, 17, 0.14), 0 2px 8px 0 rgba(7, 12, 17, 0.08);

  --duration-fast:   100ms;
  --duration-base:   150ms;
  --duration-slow:   250ms;
  --duration-slower: 1s;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in:      cubic-bezier(0.4, 0, 1, 1);
  --ease-out:     cubic-bezier(0, 0, 0.2, 1);
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);

  --font-display:        var(--font-gilroy, "Gilroy"), var(--font-inter, "Inter"), system-ui, sans-serif;
  --font-display-weight: 700;
  --font-body:           var(--font-inter, "Inter"), system-ui, sans-serif;
  --font-mono:           var(--font-jetbrains, "JetBrains Mono"), "Fira Code", ui-monospace, monospace;

  --tracking-display:  -0.02em;
  --tracking-title:    -0.015em;
  --tracking-heading:  -0.01em;
  --tracking-subtitle: -0.005em;
  --tracking-none:     0;
  --tracking-overline: 0.08em;
  --tracking-mono:     0.02em;

  --leading-display: 1.1;
  --leading-title:   1.2;
  --leading-heading: 1.3;
  --leading-snug:    1.25;
  --leading-ui:      1.4;
  --leading-body:    1.57;
  --leading-caption: 1.4;
}

.dark {
  --color-bg:              oklch(10% 0.018 265);
  --color-surface:         oklch(14% 0.022 265);
  --color-surface-raised:  oklch(17% 0.025 265);
  --color-surface-inset:   var(--neutral-10);
  --color-surface-overlay: rgba(0, 0, 0, 0.65);
  --color-border:          var(--neutral-9);
  --color-border-strong:   var(--neutral-7);
  --color-text-primary:    var(--grey-1);
  --color-text-secondary:  var(--neutral-4);
  --color-text-tertiary:   var(--neutral-6);
  --color-text-disabled:   var(--neutral-8);
  --color-brand-subtle:    var(--exa-11);
  --color-brand-muted:     var(--exa-10);
  --color-brand-light:     var(--exa-9);
  --color-danger-subtle:   var(--red-11);
  --color-success-subtle:  var(--green-11);
  --color-warning-subtle:  var(--ylw-11);
  --color-info-subtle:     var(--exa-11);
}
```

### 6.3 Color System

| Layer | Purpose | When to use |
|---|---|---|
| **Raw palette** | 11-step perceptual scales per hue | Token source files only |
| **Semantic tokens** | Resolved intent-based variables | All app-chrome components and custom CSS |

**Rule:** Components and custom UI must only reference semantic tokens. Never hard-code a raw palette step (e.g., `#0072ED`) directly in a component stylesheet. Use `var(--color-brand)` instead.

#### Status Color Pattern

Each status (`success`, `danger`, `warning`, `info`) provides three tokens:

```
--color-{status}         → vibrant anchor  (icon, border, filled button)
--color-{status}-subtle  → tinted bg       (alert background, badge bg)
--color-{status}-text    → dark text shade  (readable text on subtle bg)
```

Use these for import-confidence banners, AI/parse error states, and settings connection-test results.

### 6.4 Typography

| Role | Font | Fallback chain |
|---|---|---|
| Display / titles (H1–H6) | **Gilroy** | Inter → system-ui → sans-serif |
| Body, Label, Caption, Overline, buttons | **Inter** | system-ui → sans-serif |
| IDs, codes, technical strings | **JetBrains Mono** | Fira Code → ui-monospace → monospace |

> **Font loading:** Gilroy from licensed files in `public/assets/fonts` (woff2, app chrome) and `public/fonts` (TTF, resume PDF). Inter via `next/font/google` in the app and TTF in `public/fonts` for PDF. JetBrains Mono via Google Fonts. Resume templates cannot read CSS tokens — they register the same families in `templates/fonts.ts` and pick Gilroy vs Inter in `templates/<id>/tokens.ts`. Preview and export share `toPdfBlob()`, so they stay identical.

#### Text Casing Rules

| Context | Casing |
|---|---|
| Titles, field labels, button labels, input labels, nav items, table headers | **Title Case** |
| Long, descriptive text — helper text, empty states, error messages | **Sentence case** |
| `overline` style | **UPPERCASE** |
| IDs, codes | Mono style, preserve original case |
| Official brand names | Exact casing always: `Exabyting`, `ExaDesign` |
| Acronyms | All uppercase always: `PDF`, `API`, `URL`, `AI` |

> **No emojis** in any UI text element.

### 6.5 Spacing

All spacing in app-chrome CSS must come from the 4px-base token scale (`--space-1` through `--space-24`). Never use arbitrary pixel values. Grid gutters: `--space-4` (tight), `--space-6` (default), `--space-8` (open/comfortable).

### 6.6 Border Radius

`--radius-xs` (4px, tags/badges) through `--radius-full` (pills, avatars, chips). `--radius-md` (8px) for default buttons/inputs, `--radius-lg` (12px) for cards.

### 6.7 Shadow / Elevation

`--shadow-1` (hover lift) → `--shadow-4` (modal/dialog). Never apply shadow to flat, inline, or text elements.

### 6.8 Motion & Animation

All transitions use a token duration (`--duration-fast/base/slow/slower`) and token easing (`--ease-default/in/out/spring`). Prefer animating `transform`/`opacity` over layout properties. Respect `prefers-reduced-motion`.

### 6.9 Focus & Accessibility

```css
:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}
```

Never use `outline: none` without a replacement. Minimum touch target: 44×44px (mobile), 32×32px (desktop). WCAG 2.1 AA contrast. Icon-only buttons need `aria-label`. This matters especially for the drag-and-drop section/entry reordering (`@dnd-kit`) — ensure keyboard-based reordering is also supported, not just pointer drag.

### 6.10 Component Patterns

Apply these when building custom app-chrome components without a shared library:

**Button** — variants `primary`/`secondary`/`tertiary`, sizes `l`(48px)/`m`(40px)/`s`(32px). `primary`: `--color-brand` bg, `--color-text-on-brand` text. `secondary`: transparent bg, `--color-brand` text/border. `tertiary`: transparent, `--color-text-primary`. Labels always Title Case, never ALL CAPS.

**Input / Text Field** — sizes `l`(56px)/`m`(48px)/`s`(40px), `--radius-lg`, `--color-border` default, `--color-border-focus` on focus, `--color-danger` when `aria-invalid`.

**Badge** — used for import confidence ("AI-parsed", "Needs review"), variants `default`/`secondary`/`destructive`/`outline`/`ghost`, `--radius-full`.

**Select / Dropdown** — used for template picker, AI provider/model selection. Trigger matches Input sizing; option panel `--color-surface-raised` + `--shadow-3`; selected option `--color-brand-subtle` bg.

**Tabs** — if the editor uses tabs (e.g. section-type presets), `line` variant preferred: `--color-brand` underline, 220ms transition.

**Dialog / Modal** — used for "Add section" picker, delete confirmations. Backdrop `--color-surface-overlay` + blur, panel `--shadow-4` + `--radius-xl`, always a labeled close button, trap focus.

**Switch / Toggle** — used for section visibility toggle. Track off `--color-border`, on `--color-brand`.

### 6.11 Layout & Grid

CSS Grid or Flexbox only — no layout frameworks in app chrome. Page max-width 1280px. Page inset `--space-6` desktop / `--space-4` mobile. The editor's split-pane (form on one side, live PDF preview on the other) should collapse to a single column below a reasonable breakpoint rather than squeezing both panes.

### 6.12 Content & Writing Rules

| Rule | Detail |
|---|---|
| Button labels | Title Case, verb-first: "Add Section", not "Section Add" |
| Short UI text | Title Case: titles, field labels, nav items |
| Descriptive text | Sentence case: descriptions, help text, empty states, error messages |
| Error messages | Sentence case, specific — say what went wrong and how to fix it (especially for AI/import failures — non-technical users will read these) |
| No emojis | Never in any UI text element |
| Brand casing | Exact always: `Exabyting`, `ExaDesign` |
| Acronyms | Uppercase always: `PDF`, `PNG`, `DOCX`, `API`, `AI`, `URL` |

---

## 7. What NOT to Do

**Design system:**
- ❌ Use `!important` to override tokens — fix specificity instead.
- ❌ Introduce spacing not in the token scale.
- ❌ Write button labels in ALL CAPS or all lowercase.
- ❌ Use emojis in UI text.
- ❌ Use Tailwind utilities in app-chrome code.
- ❌ Hard-code hex values or raw palette steps in app-chrome component CSS — always use semantic tokens.
- ❌ Import `styles/tokens.css` (or any CSS) into a `templates/*` file, or vice versa reach for react-pdf primitives inside app-chrome components — the two styling systems never mix.
- ❌ Add a border "just because" — only when genuinely required.
- ❌ Put feature- or page-specific styles in `globals.css`.

**Code / modularity:**

| Pitfall | Why It Hurts |
|---|---|
| Calling `fetch` to an AI provider directly from a component instead of through `lib/ai/` | Bypasses the provider-agnostic interface; breaks when providers are added/changed |
| Reading/writing IndexedDB directly from a component instead of through `lib/storage/` | Same problem — breaks the swap-to-a-real-DB path this architecture was built for |
| A template component that reads `ResumeData` fields not defined in `lib/schema/resume.ts` | Silently couples one template to undocumented data shape assumptions |
| Copy-pasting form components with small tweaks | Design drift, duplicated bugs |
| Premature abstraction ("just in case" flexibility) | Adds complexity nobody uses — e.g. don't build a visual template editor; code-level template addition was an explicit scope decision |
| Skipping the review/confirm step after AI or heuristic import | Defeats the entire point of that screen — never auto-commit parsed data straight to storage |

---

## 8. Quick Reference — Semantic Token Cheatsheet

```
COLORS
  --color-brand              Primary action (Exa blue #0072ED)
  --color-brand-hover        Hover state
  --color-brand-active       Pressed state
  --color-brand-subtle       Tinted brand background
  --color-success/-subtle/-text     Green — positive
  --color-danger/-subtle/-text      Red — error / destructive
  --color-warning/-subtle/-text     Yellow — caution
  --color-info               Blue — informational
  --color-bg                 Page background
  --color-surface            Card / panel
  --color-surface-raised     Elevated surface (dropdown, popover)
  --color-surface-inset      Nested surface (table row, code block)
  --color-surface-overlay    Backdrop scrim
  --color-border             Default border
  --color-border-strong      Emphasis border
  --color-border-focus       Focus ring
  --color-text-primary/-secondary/-tertiary/-disabled
  --color-text-on-brand      White text on brand backgrounds
  --color-link / -hover      Hyperlink

SPACING          --space-1 (4px) through --space-24 (96px)
RADIUS           --radius-xs (4px) through --radius-full (9999px)
SHADOW           --shadow-1 (subtle) through --shadow-4 (high)
DURATION         --duration-fast (100ms)  --duration-base (150ms)
                 --duration-slow (250ms)  --duration-slower (1s)
EASING           --ease-default  --ease-in  --ease-out  --ease-spring
FONTS            --font-display (Gilroy)  --font-body (Inter)
                 --font-mono (JetBrains Mono)  --font-display-weight (700)
TRACKING         --tracking-display/-title/-heading/-subtitle/-none/-overline/-mono
LEADING          --leading-display/-title/-heading/-snug/-ui/-body/-caption
```

---

## 9. Pre-Merge Checklist

- [ ] Does this module do one clear thing?
- [ ] Could someone else swap out `lib/storage`, `lib/ai`, or a `templates/` entry without touching this file?
- [ ] Did I use existing design tokens/components instead of inventing new ones?
- [ ] Does each new/changed app-chrome component have a co-located `.css` file (§2.5)?
- [ ] Did I keep app-chrome styling (CSS/ExaDesign tokens) and resume-template styling (react-pdf `StyleSheet`/JS tokens) strictly separate?
- [ ] If this touches import or AI-parsed data: does it still land on the review/confirm screen before being saved?
- [ ] Is the public interface of this module minimal and intentional?
- [ ] Would a non-technical user understand any new UI copy without explanation?

---

## 10. Further Reading
- *Clean Code* — Robert C. Martin
- *A Philosophy of Software Design* — John Ousterhout
- [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/) — Brad Frost
- [`@react-pdf/renderer` docs](https://react-pdf.org/) — the resume-template rendering model

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
