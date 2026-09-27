// Parsing the course and assessment forms, shared by the create and edit
// endpoints so both enforce the same rules.
import type { AssessmentInput, CourseInput } from "./data/courses";
import { number, type Parsed, text } from "./forms";
import { isGrade } from "./grading";
import { TERMS, type Term } from "./schema";

export function parseCourse(form: FormData): Parsed<CourseInput> {
  const code = text(form, "code", "Course code", 12);
  if (!code.ok) return code;
  const title = text(form, "title", "Course name", 120);
  if (!title.ok) return title;
  const units = number(form, "units", "Units", { min: 1, max: 48 });
  if (!units.ok) return units;
  const year = number(form, "year", "Year", { min: 1994, max: 2100 });
  if (!year.ok) return year;
  const term = String(form.get("term") ?? "");
  if (!(TERMS as readonly string[]).includes(term)) return { ok: false, error: "Pick a session." };
  const grade = String(form.get("grade") ?? "");
  if (grade !== "" && !isGrade(grade)) return { ok: false, error: "Pick a grade from the list." };
  return {
    ok: true,
    value: {
      code: code.value.toUpperCase().replace(/\s+/g, ""),
      title: title.value,
      units: Math.round(units.value!),
      year: Math.round(year.value!),
      term: term as Term,
      grade: grade || null,
    },
  };
}

export function parseAssessment(form: FormData): Parsed<AssessmentInput> {
  const name = text(form, "name", "Assessment name", 80);
  if (!name.ok) return name;
  const weight = number(form, "weight", "Weight", { min: 0, max: 100 });
  if (!weight.ok) return weight;
  const outOf = number(form, "outOf", "Out of", { min: 0.5, max: 1000 });
  if (!outOf.ok) return outOf;
  const score = parseScore(form, outOf.value!);
  if (!score.ok) return score;
  return { ok: true, value: { name: name.value, weight: weight.value!, outOf: outOf.value!, score: score.value } };
}

export function parseScore(form: FormData, outOf: number): Parsed<number | null> {
  return number(form, "score", "Your mark", { min: 0, max: outOf, optional: true });
}
