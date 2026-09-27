import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { type Assessment, assessments, type Course, courses, type Term } from "../schema";

// Every read and write here takes the logged-in student's id and filters on
// it, so an id in a URL can never reach another student's data
// (docs/harness/architecture.md).

export type { Assessment, Course };

export interface CourseWithAssessments extends Course {
  assessments: Assessment[];
}

export interface CourseInput {
  code: string;
  title: string;
  units: number;
  year: number;
  term: Term;
  grade: string | null;
}

export interface AssessmentInput {
  name: string;
  weight: number;
  score: number | null;
  outOf: number;
}

export function listCourses(studentId: number): CourseWithAssessments[] {
  const rows = db.select().from(courses).where(eq(courses.studentId, studentId)).all();
  if (rows.length === 0) return [];
  const items = db
    .select()
    .from(assessments)
    .where(
      inArray(
        assessments.courseId,
        rows.map((c) => c.id),
      ),
    )
    .orderBy(asc(assessments.position), asc(assessments.id))
    .all();
  return rows.map((c) => ({ ...c, assessments: items.filter((a) => a.courseId === c.id) }));
}

export function getCourse(studentId: number, courseId: number): CourseWithAssessments | undefined {
  const course = db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.studentId, studentId)))
    .get();
  if (!course) return undefined;
  const items = db
    .select()
    .from(assessments)
    .where(eq(assessments.courseId, course.id))
    .orderBy(asc(assessments.position), asc(assessments.id))
    .all();
  return { ...course, assessments: items };
}

export function createCourse(studentId: number, input: CourseInput): Course {
  return db
    .insert(courses)
    .values({ ...input, studentId })
    .returning()
    .get();
}

export function updateCourse(studentId: number, courseId: number, input: CourseInput): boolean {
  const res = db
    .update(courses)
    .set(input)
    .where(and(eq(courses.id, courseId), eq(courses.studentId, studentId)))
    .run();
  return res.changes > 0;
}

export function setTargetMark(studentId: number, courseId: number, target: number | null): boolean {
  const res = db
    .update(courses)
    .set({ targetMark: target })
    .where(and(eq(courses.id, courseId), eq(courses.studentId, studentId)))
    .run();
  return res.changes > 0;
}

export function deleteCourse(studentId: number, courseId: number): boolean {
  const res = db
    .delete(courses)
    .where(and(eq(courses.id, courseId), eq(courses.studentId, studentId)))
    .run();
  return res.changes > 0;
}

/** Assessments hang off a course, so ownership is checked through it. */
function ownsCourse(studentId: number, courseId: number): boolean {
  return getCourse(studentId, courseId) !== undefined;
}

export function addAssessment(
  studentId: number,
  courseId: number,
  input: AssessmentInput,
): Assessment | null {
  const course = getCourse(studentId, courseId);
  if (!course) return null;
  const position = course.assessments.length;
  return db
    .insert(assessments)
    .values({ ...input, courseId, position })
    .returning()
    .get();
}

export function updateAssessment(
  studentId: number,
  courseId: number,
  assessmentId: number,
  input: AssessmentInput,
): boolean {
  if (!ownsCourse(studentId, courseId)) return false;
  const res = db
    .update(assessments)
    .set(input)
    .where(and(eq(assessments.id, assessmentId), eq(assessments.courseId, courseId)))
    .run();
  return res.changes > 0;
}

export function deleteAssessment(studentId: number, courseId: number, assessmentId: number): boolean {
  if (!ownsCourse(studentId, courseId)) return false;
  const res = db
    .delete(assessments)
    .where(and(eq(assessments.id, assessmentId), eq(assessments.courseId, courseId)))
    .run();
  return res.changes > 0;
}

export function deleteAllCourses(studentId: number): void {
  db.delete(courses).where(eq(courses.studentId, studentId)).run();
}
