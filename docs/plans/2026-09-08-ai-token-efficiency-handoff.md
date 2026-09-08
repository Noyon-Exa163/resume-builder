# AI Chat Effectiveness / Token-Efficiency — Handoff

Status: **idea 4 (Q&A routing) implemented.** Ideas 1–3 still open — see
"Remaining ideas" below.

## Context

User asked: "What are some improvements we can do to make the AI more
effective and more token efficient?" Then clarified the real setup:
**OpenRouter, no pinned model** — the admin left "Model" blank in AI
Settings, so every call falls back to OpenRouter's own auto-router
(`openrouter/auto`, see `lib/ai/providers/openrouter.ts`). The user
explicitly wanted: **route plain Q&A turns to cheaper/free OpenRouter
models**, escalating to the main model only for turns that actually edit
the resume. That's what got built.

## What shipped (idea 4 — Q&A model routing)

- `lib/ai/chatRouting.ts` (new) — `classifyChatIntent()` makes one small,
  cheap classifier call (`{system: <edit-vs-question prompt>, message}`,
  `maxTokens: 20`) that returns `"edit" | "question"`. Any failure
  (parse error, network, rate limit) defaults to `"edit"` — a missed
  free-routing opportunity is fine; a silently-dropped edit is not.
  `runQaChat()` runs the Q&A-only turn with a two-model fallback list.
- **Model choice — no hardcoded free-model id.** Rather than pin a specific
  `:free` model (which drifts — OpenRouter's free catalog was checked live
  via `https://openrouter.ai/api/v1/models` while building this and had
  ~19 free entries, none of which existed in this assistant's training
  data), both the classifier and the Q&A path use **`openrouter/free`** —
  OpenRouter's own router that auto-picks a live free model per request
  ("Free Models Router... selects free models at random from the models
  available on OpenRouter... smartly filters"). This sidesteps the
  catalog-drift problem entirely instead of working around it.
  Fallback-on-error is `[openrouter/free, config.model || "openrouter/auto"]`
  — if the free router itself is down, the turn still completes on the
  admin's configured (likely paid) model rather than failing outright.
- **Routing only applies when `provider.id === "openrouter"`** — other
  providers (Anthropic, Gemini, DeepSeek, custom OpenAI-compatible) are
  untouched; there's no free-router equivalent to point them at, and the
  doc's original ask was OpenRouter-specific.
- **Attachments always go through the edit path** (`attachedFileText`
  present ⇒ skip classification, `intent = "edit"`) — an attached file may
  be a full resume to import, which the lighter Q&A prompt can't handle.
- `lib/ai/chatPrompt.ts` — added `buildQaChatPrompt()`, a lighter system
  prompt used only on the Q&A path: drops `RESUME_SCHEMA_DESCRIPTION` and
  all resume-editing instructions (the model never returns a `resume`
  field on this path), so its input-token cost is a fraction of the full
  `buildChatPrompt()`. This is a narrow, low-risk slice of idea 2's
  "stop sending things the model doesn't need this turn" spirit, applied
  only where the resume-editing capability genuinely isn't needed.
- `lib/ai/http.ts` — added `QA_CHAT_MAX_TOKENS = 512` (Q&A replies are
  `{reply}` only, no resume payload, so they need far fewer output tokens
  than `EXTRACT_MAX_TOKENS` (8192) used on the edit path).
- `app/api/import/ai-chat/route.ts` — wires it together: classify (when
  eligible) → branch → light `QaEnvelopeSchema` (`{reply}`) on the Q&A
  path vs. the existing full `ChatEnvelopeSchema` (`{reply, resume?}`) on
  the edit path. Both paths keep the existing "model answered in plain
  prose instead of the JSON envelope" fallback.

No `AIProvider` interface changes — `chat()` still takes a single model
string per call; the two-model fallback is a plain sequential retry loop
in `chatRouting.ts`, not a provider-level `models: [...]` array feature.

## Remaining ideas (not yet implemented)

1. **Prompt caching** (Anthropic-style `cache_control` / OpenAI-style
   automatic caching) — still blocked on the *edit* path being pinned to a
   specific model rather than `openrouter/auto`, since caching only pays
   off when the same underlying model sees the same prefix across turns.
   Unaffected by the Q&A routing work above (that's a separate, already
   free/cheap path).
2. **Patch-style edit responses** instead of re-emitting the full resume
   JSON on every edit turn (`{reply, resume: <FULL resume>}` →
   `{reply, patch: [...]}`). Provider-agnostic, biggest token savings for
   large resumes, but riskiest to implement correctly (array patch
   semantics for section/entry reorder, insert, delete). Independent of
   everything above — can be done anytime.
3. **Stronger structured output** (`response_format: json_object` →
   `json_schema` strict mode) on the edit path — still blocked on pinning
   a specific model known to support strict mode; `openrouter/auto` (or an
   unpinned admin config) makes this unreliable. The Q&A path doesn't need
   this since its envelope is trivial (`{reply}`).

## Testing notes for whoever picks this up next

Not yet exercised against a live OpenRouter key in this session (no
network-callable test harness for the chat route was set up). Before
trusting this in production:
- Confirm `openrouter/free` actually resolves and returns valid JSON with
  `jsonMode: true` from a real account (the model's `supported_parameters`
  list from the live models API included `response_format` /
  `structured_outputs`, so this should work, but verify a real trip).
- Try a phrasing this classifier is likely to get wrong on purpose (e.g.
  "Can you shorten the summary?" — grammatically a question, an edit in
  intent) and confirm it lands on `"edit"`, not `"question"`.
- Confirm the fallback triggers correctly if `openrouter/free` 429s (hard
  to simulate without hitting real rate limits — code review of
  `chatWithFallback()` in `lib/ai/chatRouting.ts` is the fallback if a
  live repro isn't practical).
