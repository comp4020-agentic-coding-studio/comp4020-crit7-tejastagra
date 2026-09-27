import { gradeForMark, type MarkGrade } from "./scale";

export interface AssessmentMark {
  /** Percentage of the course, e.g. 40 for a 40% exam. */
  weight: number;
  score: number | null;
  outOf: number;
}

export interface CourseStanding {
  /** Course marks already banked: Σ weight × score/outOf. */
  secured: number;
  weightMarked: number;
  weightRemaining: number;
  totalWeight: number;
  /** Average percentage across marked work, or null if nothing is marked. */
  averageSoFar: number | null;
  /** The best the course can finish on: secured + all remaining weight. */
  maxPossible: number;
  /** The grade the marked work is tracking at, or null if nothing marked. */
  trackingGrade: MarkGrade | null;
  weightsSumTo100: boolean;
}

export function percentage(score: number, outOf: number): number {
  return outOf > 0 ? (score / outOf) * 100 : 0;
}

export function courseStanding(items: readonly AssessmentMark[]): CourseStanding {
  let secured = 0;
  let weightMarked = 0;
  let weightRemaining = 0;
  for (const item of items) {
    if (item.score === null) {
      weightRemaining += item.weight;
    } else {
      if (item.outOf > 0) secured += (item.weight * item.score) / item.outOf;
      weightMarked += item.weight;
    }
  }
  const totalWeight = weightMarked + weightRemaining;
  const averageSoFar = weightMarked > 0 ? (secured / weightMarked) * 100 : null;
  return {
    secured,
    weightMarked,
    weightRemaining,
    totalWeight,
    averageSoFar,
    maxPossible: secured + weightRemaining,
    trackingGrade: averageSoFar === null ? null : gradeForMark(averageSoFar),
    weightsSumTo100: Math.abs(totalWeight - 100) < 0.01,
  };
}

export type NeededStatus = "secured" | "possible" | "out-of-reach" | "finished";

export interface NeededResult {
  status: NeededStatus;
  target: number;
  /** Average % needed across every remaining item, when that's meaningful. */
  neededPercent: number | null;
  /** Course marks still needed from remaining work. */
  marksNeeded: number;
  standing: CourseStanding;
}

/** What the student needs, as an average across remaining assessment, to
 *  finish the course on `target` (a course mark out of 100). */
export function neededForTarget(items: readonly AssessmentMark[], target: number): NeededResult {
  const standing = courseStanding(items);
  const marksNeeded = Math.max(0, target - standing.secured);
  const base = { target, marksNeeded, standing };

  if (standing.secured >= target) return { ...base, status: "secured", neededPercent: 0 };
  if (standing.weightRemaining <= 0) return { ...base, status: "finished", neededPercent: null };

  const neededPercent = (marksNeeded / standing.weightRemaining) * 100;
  return {
    ...base,
    status: neededPercent > 100 ? "out-of-reach" : "possible",
    neededPercent,
  };
}

/** The final course mark: only meaningful once everything is marked. */
export function finalMark(items: readonly AssessmentMark[]): number | null {
  const s = courseStanding(items);
  return s.weightRemaining === 0 && s.totalWeight > 0 ? s.secured : null;
}
