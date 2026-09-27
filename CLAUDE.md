# CLAUDE.md — ANU Grades: a results archive and GPA planner

This is the harness for crit 7 ("Build the ANU system you wish existed"). The
app is the grade-release system a student actually wants: log in, see every
released result with its assessment breakdown, and plan forward, both for the
degree (target GPA) and inside each course (what do I need on the rest).

Every rule below has a reason written next to it. If you can't say why a rule
exists, ask before dropping it; if a rule is in your way, that is not evidence
its reason has stopped applying.

## The three things that must never be wrong

1. **The maths follows ANU's published rules, not intuition.** Grade bands,
   grade points, which results count and the GPA rounding all come from
   @docs/harness/anu-rules.md. A student will make enrolment decisions off
   these numbers.
2. **The full feature set works on a phone.** Students check results on their
   phone the moment the release email lands. Nothing is desktop-only.
3. **A student only ever sees their own data.** Every query that touches
   courses or assessments is scoped by the logged-in student's id.

## Fixed by the course (do not change)

- `fly.toml`, the `Dockerfile` and `.github/workflows/checks.yml`: the course
  watches their shape. One machine, one volume.
- `spec/invariants.test.ts`, `spec/readme.test.ts`, `spec/global-setup.ts`:
  keep them green, never delete or loosen them.
- `/api/events` must keep streaming an opening comment immediately: the
  post-deploy CI probe curls it.
- `/readme/` serves the whole of `README.md`.

## The rest of the harness

- @docs/harness/anu-rules.md — the grading scale, GPA formula and exclusions,
  with sources. The only place grading facts come from.
- @docs/harness/architecture.md — module boundaries (pure grading core, data
  layer, auth, pages), the schema and migration flow, and data scoping.
- @docs/harness/ux-mobile.md — mobile-first layout, forms that work without
  JavaScript, accessibility, and the plain student-facing voice.
- @docs/harness/spec-and-process.md — which tests protect which promise,
  how to run them, commit discipline, and what to do when a change would
  break a check.
