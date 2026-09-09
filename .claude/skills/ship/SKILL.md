---
name: ship
description: Commit and push the current branch's changes, merge it into main, deploy to Netlify, and switch back to the original branch once the deploy succeeds — fixing any build/deploy failures along the way. Use when the user says "ship", "ship it", "ship this", or runs /ship.
user-invocable: true
---

# Ship — commit, merge to main, deploy, return

A full release pipeline for this repo (Next.js on Netlify, GitHub remote
`origin`), run end-to-end from a single `/ship` invocation. It commits
whatever is on the current branch, lands it on `main`, deploys `main` to
Netlify, and leaves the working tree back on the branch you started from —
retrying/fixing along the way if the build or deploy fails.

This is a high-blast-radius command by design (it pushes to the shared
remote and deploys to production) — that is the point of having a dedicated,
explicit `/ship` command instead of doing this ad hoc. Because the user
invoking `/ship` is the authorization for the push/merge/deploy steps below,
do not stop to re-confirm those specific actions. Everything else in the
git safety protocol still applies without exception: never force-push, never
skip hooks (`--no-verify`), never discard uncommitted work, never amend an
already-pushed commit, and always look at what's actually staged before
committing (`git status` after `git add`) — if anything staged looks like a
secret or credential, stop and ask before committing it, ship or no ship.

## 0. Preconditions

- Run `git status` first, before anything else, and read it. If the working
  tree is genuinely unrelated mid-work (e.g. a rebase or merge already in
  progress, detached HEAD, etc.), stop and tell the user rather than
  plowing through — this skill assumes a normal feature branch with a clean
  or dirty-but-coherent working tree.
- Record the starting branch: `START_BRANCH=$(git branch --show-current)`.
  If this is empty (detached HEAD), stop and ask the user what to do.
- Confirm Netlify auth before doing anything destructive to git:
  `netlify status`. If it reports not logged in, stop and ask the user to
  run `netlify login` themselves (this needs an interactive OAuth flow you
  cannot complete) rather than proceeding.

## 1. Commit whatever is on the current branch

If `git status` shows no changes at all, skip to step 2 (nothing to
commit, but the user may still want main re-deployed).

Otherwise, follow the standard commit protocol:

1. `git status` (untracked files) and `git diff` (unstaged + staged) — read
   both before staging anything.
2. `git log --oneline -10` to match this repo's message style.
3. Stage deliberately (prefer specific paths over `git add -A`); re-run
   `git status` after staging and eyeball it — do not commit anything that
   looks like `.env`, credentials, or other secrets without stopping to ask.
4. Write a commit message that explains *why*, 1-3 sentences, in this
   repo's existing style. Use a HEREDOC so multi-line messages format
   correctly. Append whatever attribution footer your current system
   instructions specify for commits (Co-Authored-By / Claude-Session line)
   — do not hardcode a specific session URL into this skill file itself.
5. Commit. If a pre-commit hook fails, fix the underlying issue, re-stage,
   and make a **new** commit — never `--no-verify`, never amend a commit
   that a failed hook means never actually happened.

Push the branch: `git push origin HEAD` (or `git push -u origin HEAD` if it
has no upstream yet — check with `git status` or `git rev-parse
--abbrev-ref --symbolic-full-name @{u} 2>/dev/null`).

If `START_BRANCH` is already `main`, you've just pushed straight to main —
skip step 2 (there is nothing to merge) and go to step 3.

## 2. Merge into main

1. `git fetch origin main`
2. `git checkout main`
3. `git merge origin/main --ff-only` (in case main moved upstream since you
   last saw it — this should always fast-forward cleanly since you just
   fetched; if it doesn't, something unexpected changed main concurrently —
   stop and tell the user).
4. `git merge "$START_BRANCH"` — plain merge (no `--no-ff`), matching this
   repo's existing history, which is fast-forward-only so far. This will
   fast-forward silently when possible, or open a real merge if `main` and
   `$START_BRANCH` have diverged.
   - **If a real merge produces conflicts**: do not resolve them
     unilaterally by guessing intent. Stop, summarize the conflicting
     files/hunks to the user, and ask how to resolve them. Resolving a
     conflict wrong silently ships a bug — this is exactly the kind of
     judgment call that belongs to the user, not an autonomous guess.

## 3. Pre-deploy verification gate

Before pushing `main` and triggering a real Netlify build, run the same
checks locally so failures are cheap and fast to iterate on, on `main`:

```
npx tsc --noEmit
npm run lint
npm run test
npm run build
```

If any of these fail:
1. Read the actual error, fix the root cause in the code (not by disabling
   the check, not by skipping the failing test) — this is exactly the loop
   the user asked for ("fix issues until successful").
2. Re-stage, commit the fix on `main` directly (small, focused commit,
   explain what broke and why in the message), and re-run the full gate
   above from the top.
3. Repeat. If you hit **5 failed fix attempts on the same issue** without
   resolving it, stop looping — you're probably missing context (a secret
   only set in Netlify's env, a platform difference, etc.). Report exactly
   what's failing and what you tried to the user instead of continuing to
   burn cycles.

Do not proceed to step 4 until all four checks pass clean.

## 4. Push main and deploy

1. `git push origin main`
2. Trigger and watch the deploy synchronously (this builds via Netlify's
   own build image using the `npm run build` command from `netlify.toml`
   and blocks until it finishes, so you get a real pass/fail and real
   logs — this is more trustworthy than only trusting the local build in
   step 3, since Netlify's environment can differ):

   ```
   netlify deploy --prod --build
   ```

3. If this fails:
   - Read the printed build/deploy log for the actual cause. It may be
     something the local gate couldn't catch (a missing/misconfigured
     Netlify environment variable, a Node version mismatch, a Netlify
     plugin issue, etc.), or a flake.
   - If it's a code/config fix: make it, commit on `main`, re-run the full
     step 3 gate, then retry this step.
   - If it's a transient/infra failure (timeout, registry hiccup): retry
     `netlify deploy --prod --build` once or twice before treating it as a
     real failure.
   - Same 5-attempt cap as step 3 — if you can't get a clean deploy after 5
     genuine attempts, stop and report the blocker to the user rather than
     looping indefinitely.

## 5. Return to the starting branch

Once `netlify deploy --prod --build` reports success:

1. `git checkout "$START_BRANCH"` (skip if `START_BRANCH` was already
   `main`).
2. Bring the branch up to date with whatever landed on `main` during this
   run (including any fix commits from steps 3/4):
   `git merge main --ff-only` if possible; if it's not a clean fast-forward,
   do a plain `git merge main` instead so the branch has everything that
   shipped, and surface the merge commit like any other.
3. Confirm you're back where you started: `git branch --show-current`
   should print `$START_BRANCH`.

## 6. Report

Tell the user, concisely:
- What got committed/merged (branch name, commit summary).
- The deploy result (the live URL Netlify prints, if the deploy succeeded).
- Which branch you ended on (should be `$START_BRANCH`).
- Anything you had to fix along the way, and why, so it's not a silent
  surprise in the history.
