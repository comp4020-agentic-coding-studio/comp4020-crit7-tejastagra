import { roundGpa } from "./gpa";
import { GRADE_POINTS, type MarkGrade } from "./scale";

export interface PlanInput {
  /** Σ grade points × units already banked. */
  points: number;
  /** GPA-counting units already banked. */
  units: number;
  /** Units still to be graded (this semester included). */
  remainingUnits: number;
  target: number;
}

export type PlanStatus = "secured" | "possible" | "out-of-reach" | "no-units";

export interface PlanResult {
  status: PlanStatus;
  /** Average grade points needed per remaining unit. */
  neededAverage: number | null;
  /** The best GPA reachable if every remaining unit is an HD. */
  bestPossible: number | null;
  /** The GPA if every remaining unit is a fail. */
  worstPossible: number | null;
}

const MAX_POINTS = 7;

export function planTargetGpa({ points, units, remainingUnits, target }: PlanInput): PlanResult {
  if (remainingUnits <= 0) {
    const current = units > 0 ? points / units : 0;
    return {
      status: current >= target ? "secured" : "no-units",
      neededAverage: null,
      bestPossible: units > 0 ? roundGpa(current) : null,
      worstPossible: units > 0 ? roundGpa(current) : null,
    };
  }
  const total = units + remainingUnits;
  const neededAverage = (target * total - points) / remainingUnits;
  const bestPossible = roundGpa((points + MAX_POINTS * remainingUnits) / total);
  const worstPossible = roundGpa(points / total);
  let status: PlanStatus = "possible";
  if (neededAverage <= 0) status = "secured";
  else if (neededAverage > MAX_POINTS + 1e-9) status = "out-of-reach";
  return { status, neededAverage, bestPossible, worstPossible };
}

export interface GradeMix {
  higher: { grade: MarkGrade; courses: number };
  lower: { grade: MarkGrade; courses: number } | null;
}

const BY_POINTS: Record<number, MarkGrade> = { 7: "HD", 6: "D", 5: "CR", 4: "P", 0: "N" };

/** One concrete way to hit an average: a split of equal-unit courses
 *  between two adjacent grades. Many other mixes work too. */
export function exampleGradeMix(neededAverage: number, courses: number): GradeMix | null {
  if (courses <= 0 || neededAverage > MAX_POINTS) return null;
  if (neededAverage <= GRADE_POINTS.P) {
    return { higher: { grade: "P", courses }, lower: null };
  }
  const floor = Math.floor(neededAverage);
  const ceil = Math.min(MAX_POINTS, floor + 1);
  if (floor === neededAverage || floor === MAX_POINTS) {
    return { higher: { grade: BY_POINTS[floor], courses }, lower: null };
  }
  // smallest number at the higher grade whose average reaches the target
  const higherCount = Math.ceil((neededAverage - floor) * courses - 1e-9);
  const lowerCount = courses - higherCount;
  return {
    higher: { grade: BY_POINTS[ceil], courses: higherCount },
    lower: lowerCount > 0 ? { grade: BY_POINTS[floor], courses: lowerCount } : null,
  };
}
