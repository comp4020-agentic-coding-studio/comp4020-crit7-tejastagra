# CLAUDE.md — ANU Grades: a results archive and GPA planner

This is the harness for crit 7 ("Build the ANU system you wish existed"). The
app is a grade-release system with two sides. **Staff** convene course
offerings: they set up assessments, enrol students, upload marks, release
them, and set final grades. **Students** log in and see every released
result with its assessment breakdown, and plan forward: a target GPA for the
degree, and inside each course a target and "what if I get x/y on this?"

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
3. **Results are official: staff write them, students only read them.** A
   student can never create, edit or delete a course, assessment, mark or
   grade, and only sees marks their convenor has released. A staff member
   only manages offerings they convene. Every query is scoped by the
   logged-in user (student: their uni ID; staff: their convenor id).

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
- @docs/harness/visual-design.md — the university-site look measured from my
  A2 site: exact colours, weights and spacing, an 80% centred column, boxes
  over tables, one login page and no sign-up.
- @docs/harness/spec-and-process.md — which tests protect which promise,
  how to run them, commit discipline, and what to do when a change would
  break a check.
