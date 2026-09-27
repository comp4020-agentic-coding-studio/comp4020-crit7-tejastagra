import { type Grade, gradePoints } from "./scale";

export interface GradedUnit {
  grade: Grade;
  units: number;
}

export interface GpaResult {
  /** Rounded to three decimal places, or null with no counting units. */
  gpa: number | null;
  /** Σ grade points × units over counting courses. */
  points: number;
  /** Σ units over counting courses (fails included). */
  units: number;
}

/** ANU rounds GPA to three decimal places. */
export function roundGpa(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** GPA = Σ(grade points × units) ÷ Σ units, excluded results skipped
 *  entirely and fails counted as 0-point units. */
export function calculateGpa(results: readonly GradedUnit[]): GpaResult {
  let points = 0;
  let units = 0;
  for (const { grade, units: u } of results) {
    const gp = gradePoints(grade);
    if (gp === null) continue;
    points += gp * u;
    units += u;
  }
  return { gpa: units > 0 ? roundGpa(points / units) : null, points, units };
}
