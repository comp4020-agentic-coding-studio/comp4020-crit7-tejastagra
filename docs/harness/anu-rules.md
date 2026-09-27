# ANU grading rules (the source of truth for all maths)

Sources, read on 2026-09-28:

- Grading scale: https://www.anu.edu.au/students/program-administration/assessments-exams/grading-scale
- GPA: https://www.anu.edu.au/students/program-administration/assessments-exams/grade-point-average-gpa

If a grading fact isn't on one of these pages, it doesn't go in the code as a
fact. Say so in the UI instead ("your convenor decides scaling and rounding").
Why: a made-up rule that looks official is worse than a visible gap.

## Mark bands (post-1994 scale)

| Grade | Marks  | Grade points |
| ----- | ------ | ------------ |
| HD    | 80–100 | 7            |
| D     | 70–79  | 6            |
| CR    | 60–69  | 5            |
| P     | 50–59  | 4            |
| PS    | 50     | 4 (pass at supplementary exam) |
| N     | 0–49   | 0            |
| NCN   | —      | 0 (not completed / fail) |
| WN    | —      | 0 (withdrawn with failure) |

## Results excluded from GPA entirely (no points, no units)

WD, WL, CRS, CRN, HLP, DA, PX, RP, WA, WF, EE, STI, STE. Pass/fail courses are
also excluded. KU (continuing) doesn't count until the final course in the
series is graded, so treat it as excluded.

Fails (N, NCN, WN) are **not** excluded: they add their units with 0 points,
which is exactly why they hurt. Do not "helpfully" skip them.

## The formula

GPA = Σ(grade points × units) ÷ Σ units, over GPA-counting courses only,
rounded to **three decimal places**. It's on a 7-point scale over the whole
career.

The GPA page's worked example must stay a test: CR/6, D/6, P/6, PS/6, N/12,
CRS/6 (excluded), DA/6 (excluded), CR/12, HD/18, NCN/6 gives 300 / 72 = 4.167.

## Decisions we made where ANU is silent

- **Released grade beats computed grade.** A completed course shows the grade
  ANU released. A mark is only turned into a grade when no grade was released
  (in-progress courses). Why: final marks are often scaled, so the sum of
  assessment marks can disagree with the official result.
- **Bands are applied to the mark as entered, no rounding.** 79.6 is a D.
  Why: ANU doesn't publish a rounding rule; we say so on the course page
  rather than invent one.
- **"What I need" assumes the remaining weight is marked on the same scale
  and the weights sum to 100%.** If they don't sum to 100, the page warns and
  still shows the maths on what's there. Hurdles are not modelled; say so.
- **Target GPA planning shows an average, not one answer.** Many grade mixes
  reach the same GPA, so we show the average grade points needed per
  remaining unit plus one example mix, and flag targets above 7 as
  impossible.
- Honours grades (H1–H3) and pre-1994 results are out of scope for this
  prototype.
