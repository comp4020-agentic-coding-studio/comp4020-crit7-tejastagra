# Spec checks and process

## Crit 7 spec, and what protects each line

| Spec line | Protected by |
| --- | --- |
| loads at its `*.fly.dev` URL by the cutoff | deploy by hand (`flyctl deploy --remote-only --ha=false -a comp4020-crit7-tejastagra`), then `/comp4020:preflight` |
| models a slice of a real ANU system, wired end to end | `spec/grading.test.ts` (ANU rules), `spec/flows.test.ts` (login → data → pages over HTTP) |
| core flow persists across a reload | `spec/flows.test.ts`: add a course/mark/target, re-fetch, still there |
| repo shows the process | commits as we go, `PROCESS.md`, `reflections/crit-7.md`, `pnpm check:evidence` |
| account for how you directed, grounded, corrected | `PROCESS.md`, citing commits; this harness |

`pnpm check` (typecheck + build + all tests) must be green before every
commit that changes code.

## Test the contracts, not the build

Tests say what the app promises (a GPA, a needed mark, a page that survives a
reload, a student who can't see another's course), not how it's built, so
they survive a refactor. When you add a page, add it to `spec/routes.ts` if
it's public, or to `AUTHED_ROUTES` in `spec/flows.test.ts` if it's behind
login, so the accessibility checks cover it. Drive the app with the
`Client` in `spec/http.ts` (it carries the session cookie and the Origin
header Astro's CSRF check needs).

For UI changes, look at the page at 390px wide logged in as the demo
student (u7654321 / demo1234) and check there's no horizontal scroll.

## When a change would break a check

Don't edit the check to make it pass. Stop, name the conflict, and let the
human decide whether the rule changes. Why: a check exists to protect an
earlier decision; loosening it quietly hides a decision that should be made
out loud.

## Commits

- One logical change per commit; the message says the decision, not the
  mechanics ("Treat fails as 0-point units in GPA" not "update gpa.ts").
- A change to `CLAUDE.md` or `docs/harness/` is its own commit, with the rule
  that changed and why.
- Verify before claiming done: run the checks, and for UI look at the
  rendered page at phone width.
- Repo stays private until `/comp4020:ship`.
