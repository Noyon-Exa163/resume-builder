# Investigate and Fix Slow Next.js Apps (Netlify + hosted Postgres)

- **Date:** 2026-09-14
- **Audience:** Developers working on Exabyting Next.js apps (Incivia, resume builder, and anything else on Netlify with a remote database).
- **What this is:** The investigation protocol and ranked fixes that made Incivia's dashboard usable again. The database was not the problem. The same pattern shows up whenever pages paint empty, then `fetch("/api/...")`, and a persistent client shell refetches on every click.

This guide assumes **Next.js App Router**, **Netlify** (`@netlify/plugin-nextjs`), and a hosted Postgres (**Neon** or Supabase — the hops are the same). Read it before writing a "the DB is slow" ticket.

---

## 0. The rule: verify every claim against the live tree

Logs and old reports lie. Incivia's 2026-09-10 latency report was correct for a Seoul Supabase project; by the time we re-investigated, local, production, and staging already used us-east-2, and leftover Netlify **preview** contexts still pointed at the deleted Seoul URL. Fixing "Seoul" would have been the wrong work.

Before you change code:

1. Re-read the file. Grep call sites. If the claim is gone, drop it.
2. Check **which environment** the user is describing (`next dev` vs a Netlify URL).
3. Check **which database URL** that environment actually uses (`.env.local` vs Netlify context: `production`, `deploy-preview`, `branch-deploy`, `dev`). They often differ.
4. Do not treat a session-long terminal dump as one click. Separate "this navigation caused X" from "this was already in flight from the previous page."

---

## 1. Split the symptom into layers

A hung click is almost never one bug. Stack these independently:

| Layer | What it feels like | Dev or prod? |
|---|---|---|
| **First-visit compile** | Click does nothing for many seconds, then the page appears. Terminal shows `○ Compiling /some/route` then `✓ Compiled in Ns (6000+ modules)`. | **Dev only** |
| **Over-fetch on navigation** | Every sidebar click fires the same heavy list API even when the destination page does not need that data. | **Both** |
| **Client-first pages** | Spinner / empty layout, then data pops in after `/api/*` returns. | **Both** |
| **Duplicate fetchers** | Same URL two or four times in a row (React Strict Mode doubles mount effects in dev). | Dupes: both. Doubling: **dev** |
| **Fat serverless module graph** | First hit to `GET /api/foo` is seconds; later hits are hundreds of ms. GET file statically imports POST/email/PDF/sharp. | Dev compile + prod function size |
| **Geography / pooling / cold compute** | Warm queries still 100–200 ms+; first request after idle is much worse. | **Prod** (and local laptop → US DB) |

Postgres `EXPLAIN` executing in **under 1 ms** while the HTTP request takes **400 ms** means the time is network, auth, extra hops, and JSON — not indexes. Measure before you add indexes.

---

## 2. Where the user is hurting

Ask, then confirm with evidence:

| Environment | How to tell | What dominates |
|---|---|---|
| Local `next dev` | `○ Compiling` in the terminal | Module graph size. A 11 s compile cannot be fixed by a faster query. |
| Netlify production / staging | No compile lines; Network tab + `Server-Timing` | Extra serverless hops, region mismatch, unpooled connections, cold Neon compute. |
| Netlify deploy preview | Env vars often **not** the same as production | Stale `DATABASE_URL` / API keys pointing at an old or deleted project. |

Check Netlify contexts explicitly:

```bash
netlify env:get DATABASE_URL --context production --json
netlify env:get DATABASE_URL --context deploy-preview --json
netlify env:get DATABASE_URL --context branch-deploy --json
netlify env:get DATABASE_URL --context dev --json
```

Print **hostnames only**. Confirm they all match the live Neon/Supabase project. Preview contexts are the ones that get left behind on a region move.

Netlify function region:

```bash
netlify api getSite --data '{"site_id":"<site id>"}'
# look at functions_region — `cmh` is Columbus / us-east-2
```

Neon project region is in the Neon console (project settings). They must match. A Dhaka laptop talking to `us-east-2` will still pay ~100–150 ms per hop locally; that is expected and is **not** the 12-second freeze.

---

## 3. How to read a `next dev` log

Example (trimmed) from a Dashboard → Templates click:

```
○ Compiling /dashboard/templates ...
✓ Compiled /dashboard/templates in 11.5s (6407 modules)
GET /dashboard/templates 200 in 12823ms
○ Compiling /api/templates ...
GET /api/hires?page_size=100 200 in 4317ms
GET /api/templates 200 in 5241ms
```

Decode it:

- **`○ Compiling ... (N modules)`** — first visit to that route. The click is frozen until this finishes. `loading.tsx` cannot appear until the graph exists.
- **`GET /page 200 in 12823ms`** on first visit ≈ compile + render. After a warm compile, the same route should drop to tens/hundreds of ms of *Next* work plus whatever data the server actually loads.
- **`GET /api/...` during a page navigation that does not need that resource** — a layout/shell effect keyed on `pathname`, a poll/focus listener, or a leftover from the previous page.
- **Pairs of identical GETs 200–400 ms apart** — two `useEffect` callers, or React Strict Mode double-mount (dev).
- **`GET /dashboard` after landing on Templates** — sidebar `<Link>` prefetch. Usually harmless.

Warm the route once, then click again. If the second visit is still multi-second **without** `○ Compiling`, you have a real data/architecture problem. If only the first visit is slow, shrink the module graph (section 7).

---

## 4. Investigation checklist (do this in order)

Work from the click inward. Do not start in Postgres.

### 4.1 Persistent client shell / layout

Grep:

```bash
rg -n "usePathname|useEffect" src/app --glob '*layout*' src/components
rg -n "fetch\\(|dedupedFetch\\(" src/components src/app src/hooks
rg -n "page_size=100|/api/" src
```

Confirm:

- Is the dashboard (or app) chrome `"use client"` and wrapped around every child route?
- Does a `useEffect(..., [pathname])` fetch a **list the new page does not need**?
- Does a poll (`setInterval`) or `window` `focus` listener keep firing after you leave the page that needed it?

**Incivia confirmation:** `DashboardShell` called `GET /api/hires?page_size=100` (nested steps, tasks, email logs) on every pathname change, only to fill a notification bell.

### 4.2 Client-first pages

Grep:

```bash
rg -l '"use client"' src/app --glob '**/page.tsx'
```

A top-level `"use client"` `page.tsx` that `fetch("/api/...")` in `useEffect` on mount will always paint empty, then wait on a **new serverless invocation** that re-validates the session and queries the DB. That is a second trip you do not need for first paint.

Confirm what the UI actually uses from the JSON. A templates table that only shows `blocks.length` does not need every block's `config` JSON. An invite sheet that reads `block.config` **does**. Slim the **page loader**, not necessarily the mutation/detail API, until you have checked every caller.

### 4.3 No shared cache

Grep:

```bash
rg -n "unstable_cache|revalidate|cacheLife|\"use cache\"|React.cache" src
rg -n "dedupedFetch|inFlight" src
```

An in-flight-only deduper is not a cache. Sequential navigations each pay full price. A 10–30 s TTL plus `invalidate()` on mutations is enough for a handful of list URLs. Do not add React Query until you have removed the pathname refetch and server-rendered the main nav pages.

### 4.4 GET routes that import the write path

Open each slow `route.ts`. If `GET` and `POST` share a file, and `GET` has a top-level `import` of mail, PDF, `sharp`, Puppeteer, or a fixtures barrel, **every GET compile and every GET function bundle includes that work**.

Confirm with the terminal: first `GET /api/hires` compiles 6000+ modules; a later GET is fast. Split: keep GET imports tiny; `import("./_create")` inside `POST`, or move POST to a sibling module that GET never statically imports.

### 4.5 Auth on every hop

Count how many times a single click validates the session:

- Middleware
- Server layout
- Each `fetch("/api/...")` (`requireSession` / `getUser` / extra DB lookup)

A remote `getUser()`-style call is a network round trip. Local JWT verification (`getClaims()`, or verifying the cookie JWT yourself) is ~1 ms after JWKS warmup. Keep a remote user fetch only where you need a fresh auth record (email-confirm landing pages).

### 4.6 Neon / Postgres specifics (only after 4.1–4.5)

Confirm, do not assume:

| Check | How | What "good" looks like |
|---|---|---|
| Region | Neon console vs Netlify `functions_region` | Same region (for US customers, `us-east-2` + Netlify `cmh` is the usual pair). |
| Pooled URL | `DATABASE_URL` should be the **pooler** (`-pooler.` host, port `5432` or `6543` depending on setup) | Serverless functions must not open a new TCP connection per isolate without pooling. |
| Driver | `@neondatabase/serverless` (HTTP/WebSocket) vs `pg` (TCP) | In Netlify Functions, prefer the serverless driver **or** a pooled `pg` URL. Unpooled `pg` from many concurrent lambdas exhausts connections. |
| Scale-to-zero | Neon compute settings | First query after idle can take seconds. That is a cold compute, not a missing index. If the app must feel warm 24/7, disable scale-to-zero on the prod branch or keep a cheap min CU. |
| Query time vs HTTP time | `EXPLAIN (ANALYZE)` vs `Server-Timing` / `performance.now()` around the query | If SQL is 1 ms and HTTP is 400 ms, stop indexing. |

Add `Server-Timing: auth;dur=..., query;dur=...` on the hot GET routes so production Network tab separates those without a probe script.

---

## 5. Ranked fixes (do them in this order)

Stop when the click feels like a layout swap. Do not boil the ocean.

### Phase 1 — Stop hemorrhage on navigation (hours)

1. **Remove `pathname` from list fetches in the persistent shell.** Fetch on mount. Refresh on a mutation event (`hires:changed` or equivalent) only.
2. **Slim that fetch** to the columns the chrome actually needs (bell, badge counts). Do not reuse `page_size=100` with nested embeds.
3. **TTL-cache identical GETs** (about 15 s) and invalidate on mutation. Extend whatever in-flight deduper you already have; do not introduce a new data library yet.
4. **Auth widgets** must not call remote `getUser()` on every pathname change. One `getSession()` / local JWT on mount. Pathname can still gate visibility.
5. **Pass server-known flags as props** (account-setup complete, counts) instead of a client `/api/status` on every home-page mount.

### Phase 2 — Server-render the main nav pages (the architecture fix)

Mirror this shape (Incivia dashboard home already did it; Templates and Vault did not):

```tsx
// page.tsx — Server Component
export default async function TemplatesPage() {
  const { templates } = await loadTemplateList(db);
  return <TemplatesPageClient initialTemplates={templates} />;
}
```

Keep hooks, toasts, and dialogs in `*-page-client.tsx`. Mutations still `fetch` + refresh.

Rules:

- Load in the **same RSC request** as the layout, not in a follow-up browser → API → DB hop.
- Select list columns, not detail graphs.
- Keep the REST route for mutations and for clients that genuinely need the fat payload (editors, invite wizards). Verify callers before slimming a shared GET.
- Independent queries: `Promise.all`, not `await A` then `await B`.

Add `loading.tsx` next to those routes. That helps **warm** navigations. It will not hide first-compile in `next dev`.

### Phase 3 — Shrink the 6000-module graph (dev freeze + function size)

- Dynamic-import POST-only modules from GET `route.ts`.
- Import leaves (`@/lib/fixtures/templates`), not barrels (`@/lib/fixtures`).
- `experimental.optimizePackageImports` for icon packs (`lucide-react`, etc.).
- Do not `serverExternalPackages` / `outputFileTracingIncludes` a native binary onto a GET-only function if only POST needs it.

### Phase 4 — Ops (production)

- Co-locate Netlify functions and Neon in the same region.
- Use the pooled connection string in every Netlify context that runs serverless code.
- After a project move, update **all four** contexts, not just production.
- Neon scale-to-zero vs always-on is a product choice; measure a cold request before arguing about it.

---

## 6. What not to do

- Do not add React Query / SWR as the first move. You will cache a fetch you should not be making.
- Do not add indexes because a page feels slow. `EXPLAIN` first.
- Do not move the database region until you have grepped the **live** env URLs. You may already be co-located.
- Do not treat "four `/api/foo` in the log" as an infinite loop. Check Strict Mode, focus listeners, and a shell effect.
- Do not slim a shared list API until you have grepped every consumer. A list page may only need counts; a wizard on the same URL may need full nested rows.
- Do not wrap the entire app in a client provider whose `value={{ ... }}` is a new object every render until you have removed the network waterfalls. Context churn is real and usually not the hung click.

---

## 7. Verification after a fix

Local, cold `next dev`:

1. Open the home/dashboard once (pay the compile).
2. Click the next main-nav item (Templates, Vault, equivalent).
3. Terminal: **no** `GET` for the previous page's list API as a result of that click.
4. First paint of the destination includes rows, not an empty spinner waiting on `/api`.
5. Click it a second time: no `○ Compiling` for that page.

Production / preview:

- DevTools Network: no compile. Remaining API calls show `Server-Timing`. Auth should be ~1 ms if JWT is local; query should match a single pooled round trip.
- Grep: the shell file must not contain `useEffect(..., [pathname])` around a list fetch.

---

## 8. Case study: Incivia (what we actually changed)

Verified, then fixed — not guessed:

| Claim | Verdict | Fix |
|---|---|---|
| Shell refetches 100 nested hires on every dashboard navigation | Confirmed | Mount + `hires:changed` only; `fields=notifications` slim select |
| Templates/Vault are client-first | Confirmed | Server `page.tsx` + client island |
| `GET /api/hires` compiles POST/Mailgun/sharp | Confirmed | POST moved to `_create.ts`, dynamically imported |
| `dedupedFetch` does not cache resolved responses | Confirmed | 15 s TTL + `invalidate("/api/hires")` |
| Feedback widget `getUser()` on every pathname | Confirmed | `getSession()` once on mount |
| Live DB is in Seoul | **Dropped** — local, prod, staging already us-east-2 | Updated leftover Netlify preview/`dev` contexts instead |
| Shell and dashboard both hit account-setup status | **Dropped** — shell no longer did | Passed `completedSteps` from the server page |
| Templates navigation causes library + org/self GETs | **Dropped** — other screens | Left those callers alone |

The hung click was compile (dev) plus the shell's pathname refetch (everywhere). Geography was already fixed on the paths people actually used.

---

## 9. Quick grep card (paste into the other repo)

```bash
# Client pages that fetch on mount
rg -l '"use client"' src/app --glob '**/page.tsx'

# Layout/shell effects that run on every route change
rg -n "usePathname" src -g '*.tsx'

# List APIs used as chrome, not as the page's own data
rg -n "fetch\\([\"']/api/" src/components src/hooks src/app

# GET routes that pull write-path modules
rg -n "^import" src/app/api --glob '**/route.ts'

# Session validation
rg -n "getUser\\(|getClaims\\(|getSession\\(|requireSession" src

# Caching
rg -n "unstable_cache|revalidate|dedupedFetch" src

# Neon / DB
rg -n "DATABASE_URL|neon\\(|Pool\\(|postgres\\(" src
```

Then verify each match against **this** commit of the code and **this** environment's env vars before you write a fix.
