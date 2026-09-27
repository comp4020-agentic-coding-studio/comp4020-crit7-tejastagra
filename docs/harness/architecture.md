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

### The data model

```
users            id, uni_id, name, role (student | staff), password_hash,
                 target_gpa, degree_units   (the last two: student planning)
auth_sessions    token_hash, user_id, expires_at
offerings        a course in one session: code, title, units, year, term,
                 convenor_id -> users (staff)
assessment_items offering_id, name, weight, out_of, position, released
enrolments       offering_id, uni_id, name, grade (null until released),
                 target_mark (the only student-writable field)
marks            item_id, enrolment_id, score
```

Enrolments are keyed by **uni ID, not user id**, the way the university
does it: staff can enrol students and upload marks before the student has
ever logged in, and a student sees every enrolment matching their uni ID.

Marks are stored as `score` out of `out_of` (how students actually see them,
e.g. 17/20); percentages are derived. Weights are percentages of the course.

### Who can do what

- **Staff** (role `staff`): everything under `/staff/` and `/api/staff/`,
  only for offerings where `convenor_id` is their id. Staff accounts are
  seeded; there's no staff sign-up.
- **Students** (role `student`): read their enrolments, **released** items'
  marks, and released grades. They can write only their own `target_mark`
  per enrolment and `target_gpa`/`degree_units`. There are no student
  endpoints that change results. Unreleased items look unmarked to a
  student, even if staff have entered marks.
- **No sign-up.** Accounts are provisioned by the university, not created
  by whoever visits: anyone on the internet could otherwise claim a uni ID
  and read that student's results. In this prototype accounts come from
  the seed (the demo accounts and the classmates) or from
  `scripts/add-user.ts` run against the database; a real deployment gets
  them from ANU's single sign-on.

### What-if scenarios

A student's "what if I get x/y" is a GET form: the hypothetical scores ride
in the query string, the server computes the result with `grading/`, and
nothing is stored. Why: a scenario must never be mistaken for, or
overwrite, an official mark, and it works without JS.

## Auth

Uni ID (e.g. u1234567) + password, hashed with scrypt from `node:crypto`. Sessions are random tokens in an httpOnly, SameSite=Lax cookie;
only a SHA-256 of the token is stored. This is a mock of ANU login, not a
replacement for it, and the UI says so. No new auth dependencies.

Seeded demo accounts (see `src/lib/data/seed.ts`) let a visitor or tutor see
both sides without typing anything in: a demo student with a full history,
a demo convenor who runs all of that student's courses, seven classmates in
each (with accounts too, so tests can log in as a second student), and a
second convenor with no offerings, used to test staff scoping. The demo data is illustrative, not a real transcript.

## Live sync

`/api/events` is kept from the starter (CI needs it). When a logged-in student
changes their data, their other open tabs and devices get an event and
refresh. Anonymous connections get the heartbeat only. One machine means one
in-process event bus is enough (see `src/lib/events.ts`).
