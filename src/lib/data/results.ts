import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { assessmentItems, enrolments, marks, offerings, type Term } from "../schema";

// The student side: read-only views of the results staff have released.
// Everything is found through the student's uni ID, and an item's mark is
// only visible once the convenor releases the item
// (docs/harness/architecture.md). The one write is the student's own
// target mark.

export interface StudentAssessment {
  id: number;
  name: string;
  weight: number;
  outOf: number;
  /** Null until marked AND released. */
  score: number | null;
  released: boolean;
}

export interface StudentCourse {
  /** The enrolment id: what /courses/[id]/ refers to. */
  id: number;
  code: string;
  title: string;
  units: number;
  year: number;
  term: Term;
  grade: string | null;
  targetMark: number | null;
  assessments: StudentAssessment[];
}

function load(uniId: string, enrolmentId?: number): StudentCourse[] {
  const rows = db
    .select({ enrolment: enrolments, offering: offerings })
    .from(enrolments)
    .innerJoin(offerings, eq(offerings.id, enrolments.offeringId))
    .where(
      enrolmentId === undefined
        ? eq(enrolments.uniId, uniId)
        : and(eq(enrolments.uniId, uniId), eq(enrolments.id, enrolmentId)),
    )
    .all();
  if (rows.length === 0) return [];

  const offeringIds = rows.map((r) => r.offering.id);
  const items = db
    .select()
    .from(assessmentItems)
    .where(inArray(assessmentItems.offeringId, offeringIds))
    .orderBy(asc(assessmentItems.position), asc(assessmentItems.id))
    .all();
  const scores = db
    .select()
    .from(marks)
    .where(
      inArray(
        marks.enrolmentId,
        rows.map((r) => r.enrolment.id),
      ),
    )
    .all();

  return rows.map(({ enrolment, offering }) => ({
    id: enrolment.id,
    code: offering.code,
    title: offering.title,
    units: offering.units,
    year: offering.year,
    term: offering.term,
    grade: enrolment.grade,
    targetMark: enrolment.targetMark,
    assessments: items
      .filter((i) => i.offeringId === offering.id)
      .map((i) => {
        const mark = scores.find((m) => m.itemId === i.id && m.enrolmentId === enrolment.id);
        return {
          id: i.id,
          name: i.name,
          weight: i.weight,
          outOf: i.outOf,
          released: i.released,
          score: i.released && mark ? mark.score : null,
        };
      }),
  }));
}

export function listStudentCourses(uniId: string): StudentCourse[] {
  return load(uniId);
}

export function getStudentCourse(uniId: string, enrolmentId: number): StudentCourse | undefined {
  return load(uniId, enrolmentId)[0];
}

export function setTargetMark(uniId: string, enrolmentId: number, target: number | null): boolean {
  const res = db
    .update(enrolments)
    .set({ targetMark: target })
    .where(and(eq(enrolments.id, enrolmentId), eq(enrolments.uniId, uniId)))
    .run();
  return res.changes > 0;
}
