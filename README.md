# ANU Grades

ANU Grades is the results system I wish ANU had. It has two sides.

**Staff** convene course offerings. They set up the assessment items, enrol
students by uni ID (one at a time or from a class-list CSV), and enter marks
or upload them from a spreadsheet. Each item stays hidden until they release
it, and they set final grades (with a "fill from marks" shortcut).

**Students** log in and every course they've been enrolled in is there,
newest session first, with the released grade and every released mark
behind it. Their GPA is worked out exactly the way ANU does it. For a course
still running they can set a target and see what they need on what's left,
and run a **what-if**: type "72/100 on the final exam" and see the course
mark, the grade and the new career GPA. Nothing typed into a what-if is
saved. Students can't change a mark, a grade or a course. Results are
official, so only the convenor writes them.

Try both sides:

- Student: uni ID `u7654321`, password `demo1234`.
- Staff: uni ID `u1000001`, password `staff1234`. This demo convenor runs
  every course the demo student has taken, each with seven classmates.

Both use the same login page; the account decides what you see. The demo
accounts are shared, so either one can "Reset demo data".

There's no sign-up. Open sign-up would let anyone on the internet claim a
uni ID and read that student's results. Instead, accounts are provisioned:
the demo accounts and classmates come from the seed, and more can be added
with `node scripts/add-user.ts u1234567 "Full Name" student`. A real
deployment would get accounts from ANU's single sign-on. Login here is a
mock, so don't use your real ANU password.

## Why this system

At ANU your results are spread across three places. Canvas has assignment marks
per course, ANUHub has final grades and a GPA, and the maths to connect them
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

**It looks like part of the university.** The design follows my A2 course
site, using its exact colours, font weights and spacing: a plain header with
a crest and "ANU / Grades" lockup, gold headings, square cards and
gold-headed tables, in a centred column with little on each page. One login
page serves students and staff. The crest is drawn for this prototype, not
ANU's.

**It works properly on a phone.** Results emails get opened on a phone, so
every feature works at 360px wide:

- a menu that folds behind one button
- cards for anything with forms, and tables only where they fit
- big tap targets
- number keypads for marks

Every form is a plain HTML form, so it still works on bad campus wifi or with
JavaScript off.

**It talks like a person.** "You need 66 / 100 on the Final exam" and "Your
career GPA would go from 5.333 to 5.368", not "required remaining
performance 0.66". When a target is already locked in or out of reach,
it says that directly. Needed marks are rounded up to the half mark, so hitting
the number is enough.

**Results are official, and private.** Only a course's convenor can write its
marks and grades, and a student only sees marks once they're released. Tests
check that:

- a student gets refused by every staff endpoint;
- a student can't see another student's course;
- a second convenor can't open or delete the first one's course.

Enrolments are keyed by uni ID, the way the university does it, so staff can
upload marks before a student has ever logged in. When staff release
something, any open page of an affected student offers a refresh.

## What's enforced and what's judgement

Enforced by tests in `spec/` (run with `pnpm check`):

- the ANU rules and the needed-mark and planner maths (`grading.test.ts`)
- the CSV parsing for class lists and marks, including spreadsheet quirks and
  line-numbered errors (`csv.test.ts`)
- the whole flow over HTTP (`flows.test.ts`):
  1. staff create a course, add items, and enrol a student from a CSV;
  2. staff upload marks, which stay invisible until release;
  3. the student sets a target and runs a what-if;
  4. staff fill the final grade, and the student's GPA counts it.
- who can write what, for both roles
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
- Importing from ANUHub or Canvas (CSV upload stands in for it).
- Tutors or multiple convenors per course.
- Honours grades and pre-1994 results.
- Hurdle assessments.
- Scaling predictions.

The demo student's courses are real ANU course codes, but the marks are
made up. This is a prototype of the experience, not a replacement for the
official record.
