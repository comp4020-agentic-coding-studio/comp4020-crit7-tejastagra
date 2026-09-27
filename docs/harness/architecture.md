# Architecture: keep the pieces separate

The app is Astro (server output) + Drizzle + SQLite, the course's suggested
stack. The layers below only depend downward. Why: the grading maths is the
part that must be right, so it must be testable without a database, a server
or a browser.

```
src/pages/, src/components/, src/layouts/   UI: render, no maths, no SQL
src/lib/record.ts                            course rows -> what pages show, via grading/
src/lib/forms.ts, src/lib/course-form.ts     form parsing with student-worded errors
src/lib/format.ts                            how numbers read (GPA 3dp, marks 1dp)
src/lib/auth/                                passwords, sessions, cookies
src/lib/data/                                every DB read/write, scoped by student
src/lib/grading/                             pure functions: scale, GPA, needed mark, planner
src/lib/db.ts, src/lib/schema.ts             connection, migrations, schema
```

## Rules

- **`src/lib/grading/` is pure.** No imports from `db`, `astro`, or `node:`.
  Inputs are plain objects, outputs are plain objects. Every function there
  has a unit test in `spec/grading.test.ts`.
- **Pages never compute grades themselves.** If a page needs a number it asks
  `grading/`, usually through `record.ts`, which only groups and sums inputs. Why: one implementation, one set of tests; a second copy of the
  formula in a template is how a GPA quietly drifts.
- **Pages never write SQL.** They call `src/lib/data/`. Every data function
  that touches courses or assessments takes the `studentId` and filters on
  it, including updates and deletes (`where id = ? and student_id = ?`).
  Why: stops one student editing another's course by changing an id in a URL.
- **Reuse components.** Grade badges, the needed-mark panel, form fields and
  cards live in `src/components/`. A second page that shows a grade uses
  `GradeBadge`, not new markup.
- **Forms POST to `src/pages/api/...` and redirect with 303.** Errors come
  back as a `?error=` message rendered by the page. Parse input with the
  helpers in `forms.ts`; never trust a number from a form unchecked (a mark
  can't exceed what the item is out of). Why: works with no
  client JS, reload-safe, and the back button behaves.

## Schema and migrations

`src/lib/schema.ts` is the ground truth. To change it: edit it,
`pnpm db:generate`, commit the migration in `drizzle/` with the schema change.
`drizzle-kit generate` is interactive when it suspects a rename, which
fails in a non-TTY agent shell: split such a change into an add migration
and a drop migration. Never edit an existing migration or the database by hand: the deployed volume
outlives every deploy. Migrations run at boot (`src/lib/db.ts`).

Marks are stored as `score` out of `outOf` (how students actually see them,
e.g. 17/20); percentages are derived. Weights are percentages of the course.

## Auth

Username (ANU uni id, e.g. u1234567) + password, hashed with scrypt from
`node:crypto`. Sessions are random tokens in an httpOnly, SameSite=Lax cookie;
only a SHA-256 of the token is stored. This is a mock of ANU login, not a
replacement for it, and the UI says so. No new auth dependencies.

A seeded demo student (see `src/lib/data/seed.ts`) exists so a visitor or
tutor can see a full history without typing one in. The demo data is
illustrative, not a real transcript.

## Live sync

`/api/events` is kept from the starter (CI needs it). When a logged-in student
changes their data, their other open tabs and devices get an event and
refresh. Anonymous connections get the heartbeat only. One machine means one
in-process event bus is enough (see `src/lib/events.ts`).
