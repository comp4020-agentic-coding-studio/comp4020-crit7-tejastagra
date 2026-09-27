# ANU Grades

ANU Grades is the results system I wish ANU had. Log in and every course you've
taken is there, newest session first, with its released grade and the full
breakdown of assessment marks behind it. Your GPA is worked out exactly the way
ANU does it. For the courses you're doing now you can set a target and get a
plain answer to the question every student asks in week 10: "what do I need on
the final?" And for the degree as a whole you can set a target GPA and see what
the rest of your units have to average to get there.

Try it with the demo student: uni ID `u7654321`, password `demo1234`. That
account is shared, so use "Reset demo data" on the home page to put it back.
Login is a mock with its own accounts, not ANU's single sign-on. Don't use your
real ANU password.

## Why this system

At ANU your results are spread across three places. Wattle has assignment marks
per course, ISIS has final grades and a GPA, and the maths to connect them
lives in a spreadsheet you rebuild every semester. None of them answers
questions about the future: what you need on the exam, or whether a 6.0 is
still possible. This app puts the archive and the planning in one place.

## What good looks like here

**The numbers are ANU's, not mine.** Grade bands, grade points, which results
count and the rounding all come from ANU's
[grading scale](https://www.anu.edu.au/students/program-administration/assessments-exams/grading-scale)
and [GPA](https://www.anu.edu.au/students/program-administration/assessments-exams/grade-point-average-gpa)
pages:

- HD is 80 and above (7 grade points), D 70 (6), CR 60 (5), P 50 (4). N,
  NCN and WN are 0.
- GPA is the sum of grade points × units, divided by units, rounded to three
  decimal places.
- Fails count: they add units with 0 points. WD, CRS, DA and other
  non-graded results don't count at all.

The GPA page's own worked example (300 ÷ 72 = 4.167) is a test.

Where ANU says nothing, I made a choice and the app says so:

- A released grade beats a grade calculated from marks, because final marks are
  often scaled.
- Bands apply to the mark as entered with no rounding, because ANU doesn't
  publish a rounding rule.
- Hurdles aren't modelled.

**It works properly on a phone.** Results emails get opened on a phone, so
every feature works at 360px wide:

- a bottom tab bar within thumb reach
- cards instead of tables
- big tap targets
- number keypads for marks

Every form is a plain HTML form, so it still works on bad campus wifi or with
JavaScript off.

**It talks like a person.** "You need 66 / 100 on the Final exam", not "required
remaining performance 0.66". When a target is already locked in or out of reach,
it says that directly. Needed marks are rounded up to the half mark, so hitting
the number is enough.

**Your data is yours.** Every query is scoped to the logged-in student. A test
checks that another student's course returns "not found", for reads and for
writes. If you have the app open on your phone and your laptop, changing a mark
on one offers a refresh on the other.

## What's enforced and what's judgement

Enforced by tests in `spec/` (run with `pnpm check`):

- the ANU rules and the needed-mark and planner maths (`grading.test.ts`)
- the whole flow over HTTP: log in, add a course and marks, set a target, see
  what's needed, release a grade, plan a GPA, and all of it still there on a
  fresh load (`flows.test.ts`)
- per-student data scoping
- the accessibility floor on every page, logged in or not

The rules the agent building this is held to live in `CLAUDE.md` and
`docs/harness/`.

Left to judgement: whether the wording is kind and clear, whether the phone
layout feels good in the hand (checked by eye at 390px), and whether "an
average plus one example grade mix" is the right answer to "what GPA do I
need". Many grade mixes reach the same GPA, so there's no single honest
answer.

## What I chose not to build

- Real ANU login.
- Importing from ISIS or Wattle.
- Honours grades and pre-1994 results.
- Hurdle assessments.
- Scaling predictions.

The demo student's courses are real ANU course codes, but the marks are
made up. This is a prototype of the experience, not a replacement for the
official record.
