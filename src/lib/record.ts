// The academic record: turns stored courses into what the pages show, by
// asking the grading core. No database access and no maths of its own
// beyond grouping and summing inputs for grading/.
import type { StudentCourse } from "./data/results";
import {
  applyScenario,
  calculateGpa,
  courseStanding,
  type CourseStanding,
  earnsCredit,
  exampleGradeMix,
  finalMark,
  type Grade,
  type GradedUnit,
  type GradeMix,
  gradeForMark,
  gradePoints,
  isGrade,
  neededForTarget,
  type NeededResult,
  planTargetGpa,
  type PlanResult,
} from "./grading";
import { TERMS, type Term, type User } from "./schema";

export const TERM_LABELS: Record<Term, string> = {
  Summer: "Summer Session",
  S1: "Semester 1",
  Autumn: "Autumn Session",
  Winter: "Winter Session",
  S2: "Semester 2",
  Spring: "Spring Session",
};

export function termLabel(term: Term, year: number): string {
  return `${TERM_LABELS[term]} ${year}`;
}

function termRank(course: { year: number; term: Term }): number {
  return course.year * 10 + TERMS.indexOf(course.term);
}

export interface CourseView {
  course: StudentCourse;
  standing: CourseStanding;
  /** The released grade, if ANU has released one. */
  releasedGrade: Grade | null;
  /** What the marked work is tracking at (in-progress courses only). */
  trackingGrade: Grade | null;
  /** Course mark from assessments, once everything is marked. */
  mark: number | null;
  needed: NeededResult | null;
  inProgress: boolean;
}

export function viewCourse(course: StudentCourse): CourseView {
  const standing = courseStanding(course.assessments);
  const releasedGrade = course.grade && isGrade(course.grade) ? course.grade : null;
  const inProgress = releasedGrade === null;
  const mark = finalMark(course.assessments);
  return {
    course,
    standing,
    releasedGrade,
    trackingGrade: inProgress
      ? mark !== null
        ? gradeForMark(mark)
        : standing.trackingGrade
      : null,
    mark,
    needed:
      inProgress && course.targetMark !== null
        ? neededForTarget(course.assessments, course.targetMark)
        : null,
    inProgress,
  };
}

export interface SemesterView {
  key: string;
  label: string;
  courses: CourseView[];
  units: number;
  /** GPA over this semester's released results only. */
  gpa: number | null;
  inProgress: boolean;
}

export function groupBySemester(views: CourseView[]): SemesterView[] {
  const groups = new Map<string, CourseView[]>();
  const sorted = [...views].sort(
    (a, b) => termRank(b.course) - termRank(a.course) || a.course.code.localeCompare(b.course.code),
  );
  for (const v of sorted) {
    const key = `${v.course.year}-${v.course.term}`;
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }
  return [...groups.entries()].map(([key, cs]) => ({
    key,
    label: termLabel(cs[0].course.term, cs[0].course.year),
    courses: cs,
    units: cs.reduce((n, v) => n + v.course.units, 0),
    gpa: calculateGpa(
      cs.flatMap((v) => (v.releasedGrade ? [{ grade: v.releasedGrade, units: v.course.units }] : [])),
    ).gpa,
    inProgress: cs.some((v) => v.inProgress),
  }));
}

export interface PlanView extends PlanResult {
  target: number;
  remainingUnits: number;
  /** Semesters left at a full-time load of 24 units. */
  semestersLeft: number;
  mix: GradeMix | null;
  /** The same plan, if every in-progress course hits its target mark. */
  afterTargets: (PlanResult & { remainingUnits: number; mix: GradeMix | null }) | null;
}

export interface AcademicSummary {
  gpa: number | null;
  points: number;
  gpaUnits: number;
  creditUnits: number;
  inProgressUnits: number;
  degreeUnits: number;
  /** Units not yet passed, this semester's courses included. */
  remainingUnits: number;
  /** GPA if every in-progress course with a target hits it. */
  projectedGpa: number | null;
  plan: PlanView | null;
  courses: CourseView[];
  semesters: SemesterView[];
  /** Released, GPA-relevant results: the input to any GPA what-if. */
  released: GradedUnit[];
}

const FULL_TIME_LOAD = 24;
const TYPICAL_COURSE_UNITS = 6;

export function summarise(student: User, rawCourses: StudentCourse[]): AcademicSummary {
  const views = rawCourses.map(viewCourse);
  const released = views.flatMap((v) =>
    v.releasedGrade ? [{ grade: v.releasedGrade, units: v.course.units }] : [],
  );
  const { gpa, points, units: gpaUnits } = calculateGpa(released);
  const creditUnits = views.reduce(
    (n, v) => n + (v.releasedGrade && earnsCredit(v.releasedGrade) ? v.course.units : 0),
    0,
  );
  const inProgress = views.filter((v) => v.inProgress);
  const inProgressUnits = inProgress.reduce((n, v) => n + v.course.units, 0);
  const remainingUnits = Math.max(student.degreeUnits - creditUnits, inProgressUnits);

  const targeted = inProgress.flatMap((v) =>
    v.course.targetMark !== null
      ? [{ grade: gradeForMark(v.course.targetMark) as Grade, units: v.course.units }]
      : [],
  );
  const projected = calculateGpa([...released, ...targeted]);

  let plan: PlanView | null = null;
  if (student.targetGpa !== null) {
    const target = student.targetGpa;
    const base = planTargetGpa({ points, units: gpaUnits, remainingUnits, target });
    const mixFor = (avg: number | null, u: number) =>
      avg !== null && avg > 0 ? exampleGradeMix(avg, Math.ceil(u / TYPICAL_COURSE_UNITS)) : null;

    let afterTargets: PlanView["afterTargets"] = null;
    const untargetedUnits = inProgress
      .filter((v) => v.course.targetMark === null)
      .reduce((n, v) => n + v.course.units, 0);
    const targetedUnits = inProgressUnits - untargetedUnits;
    if (targetedUnits > 0) {
      const futureUnits = remainingUnits - targetedUnits;
      const r = planTargetGpa({
        points: projected.points,
        units: projected.units,
        remainingUnits: futureUnits,
        target,
      });
      afterTargets = { ...r, remainingUnits: futureUnits, mix: mixFor(r.neededAverage, futureUnits) };
    }

    plan = {
      ...base,
      target,
      remainingUnits,
      semestersLeft: Math.ceil(remainingUnits / FULL_TIME_LOAD),
      mix: mixFor(base.neededAverage, remainingUnits),
      afterTargets,
    };
  }

  return {
    gpa,
    points,
    gpaUnits,
    creditUnits,
    inProgressUnits,
    degreeUnits: student.degreeUnits,
    remainingUnits,
    projectedGpa: targeted.length > 0 ? projected.gpa : null,
    plan,
    courses: views,
    semesters: groupBySemester(views),
    released,
  };
}

export interface WhatIfView {
  /** The hypothetical scores the student typed, by item id. */
  overrides: Map<number, number>;
  standing: CourseStanding;
  /** Final course mark, once every item has a real or hypothetical mark. */
  mark: number | null;
  grade: Grade | null;
  gpaNow: number | null;
  /** Career GPA with this course finishing on `grade`. */
  gpaAfter: number | null;
  /** Still-needed on anything left blank, if the student has a target. */
  needed: NeededResult | null;
}

/** Reads "what if" scores from a query string: w<itemId>=<score>. */
export function readOverrides(params: URLSearchParams): Map<number, number> {
  const overrides = new Map<number, number>();
  for (const [key, value] of params) {
    const id = /^w(\d+)$/.exec(key)?.[1];
    const score = Number(value.replace(",", "."));
    if (id && value.trim() !== "" && Number.isFinite(score)) overrides.set(Number(id), score);
  }
  return overrides;
}

/** A what-if for one in-progress course: nothing is stored, it's all
 *  computed from the released marks plus the hypothetical ones. */
export function whatIf(course: StudentCourse, overrides: Map<number, number>, released: GradedUnit[]): WhatIfView {
  const items = applyScenario(course.assessments, overrides);
  const standing = courseStanding(items);
  const mark = finalMark(items);
  const grade = mark === null ? null : gradeForMark(mark);
  return {
    overrides,
    standing,
    mark,
    grade,
    gpaNow: calculateGpa(released).gpa,
    gpaAfter: grade === null ? null : calculateGpa([...released, { grade, units: course.units }]).gpa,
    needed: mark === null && course.targetMark !== null ? neededForTarget(items, course.targetMark) : null,
  };
}

/** Grade points for a grade, formatted for display ("7", or "—"). */
export function pointsLabel(grade: Grade): string {
  const gp = gradePoints(grade);
  return gp === null ? "not in GPA" : `${gp} grade points`;
}
