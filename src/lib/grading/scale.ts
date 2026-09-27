// The ANU grading scale (post-1994) and grade point values, from
// docs/harness/anu-rules.md. Nothing else in the app hard-codes a band.

export const MARK_GRADES = ["HD", "D", "CR", "P", "N"] as const;
export type MarkGrade = (typeof MARK_GRADES)[number];

/** Grades that count towards GPA, with their points on the 7-point scale. */
export const GRADE_POINTS = {
  HD: 7,
  D: 6,
  CR: 5,
  P: 4,
  PS: 4,
  N: 0,
  NCN: 0,
  WN: 0,
} as const;

/** Results that carry no points and no units in the GPA. */
export const EXCLUDED_GRADES = [
  "WD",
  "WL",
  "CRS",
  "CRN",
  "HLP",
  "DA",
  "PX",
  "RP",
  "WA",
  "WF",
  "EE",
  "STI",
  "STE",
  "KU",
] as const;

export type CountingGrade = keyof typeof GRADE_POINTS;
export type ExcludedGrade = (typeof EXCLUDED_GRADES)[number];
export type Grade = CountingGrade | ExcludedGrade;

export const ALL_GRADES: readonly Grade[] = [
  ...(Object.keys(GRADE_POINTS) as CountingGrade[]),
  ...EXCLUDED_GRADES,
];

export const GRADE_NAMES: Record<Grade, string> = {
  HD: "High Distinction",
  D: "Distinction",
  CR: "Credit",
  P: "Pass",
  PS: "Pass (supplementary)",
  N: "Fail",
  NCN: "Not completed / Fail",
  WN: "Withdrawn with failure",
  WD: "Withdrawn without failure",
  WL: "Withdrawn late without failure",
  CRS: "Course requirement satisfied",
  CRN: "Course requirement not satisfied",
  HLP: "Higher level pass",
  DA: "Deferred assessment",
  PX: "Offered supplementary assessment",
  RP: "Result pending",
  WA: "Withheld (administrative)",
  WF: "Withheld (fees)",
  EE: "Enrolled elsewhere",
  STI: "Status internal",
  STE: "Status external",
  KU: "Continuing",
};

/** Lowest mark for each mark-band grade. */
export const GRADE_THRESHOLDS: Record<Exclude<MarkGrade, "N">, number> = {
  HD: 80,
  D: 70,
  CR: 60,
  P: 50,
};

export function isGrade(value: string): value is Grade {
  return (ALL_GRADES as readonly string[]).includes(value);
}

export function countsTowardsGpa(grade: Grade): grade is CountingGrade {
  return grade in GRADE_POINTS;
}

/** Grade points, or null when the result is excluded from GPA. */
export function gradePoints(grade: Grade): number | null {
  return countsTowardsGpa(grade) ? GRADE_POINTS[grade] : null;
}

/** The band a mark falls in, applied to the mark as entered (no rounding:
 *  ANU publishes no rounding rule). */
export function gradeForMark(mark: number): MarkGrade {
  if (mark >= GRADE_THRESHOLDS.HD) return "HD";
  if (mark >= GRADE_THRESHOLDS.D) return "D";
  if (mark >= GRADE_THRESHOLDS.CR) return "CR";
  if (mark >= GRADE_THRESHOLDS.P) return "P";
  return "N";
}

/** A passing result that earns the course's units towards a degree. */
export function earnsCredit(grade: Grade): boolean {
  return ["HD", "D", "CR", "P", "PS", "CRS", "HLP"].includes(grade);
}
