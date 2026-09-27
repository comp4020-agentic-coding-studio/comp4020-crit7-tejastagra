import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../auth/password";
import { db } from "../db";
import { type Student, students } from "../schema";

export type { Student };

/** ANU uni ids are a "u" followed by seven digits. */
export const UNI_ID_PATTERN = /^u\d{7}$/;

export function normaliseUniId(raw: string): string {
  return raw.trim().toLowerCase();
}

export function findStudentByUniId(uniId: string): Student | undefined {
  return db.select().from(students).where(eq(students.uniId, normaliseUniId(uniId))).get();
}

export function getStudent(id: number): Student | undefined {
  return db.select().from(students).where(eq(students.id, id)).get();
}

export function createStudent(input: { uniId: string; name: string; password: string }): Student {
  return db
    .insert(students)
    .values({
      uniId: normaliseUniId(input.uniId),
      name: input.name.trim(),
      passwordHash: hashPassword(input.password),
    })
    .returning()
    .get();
}

export function authenticate(uniId: string, password: string): Student | null {
  const student = findStudentByUniId(uniId);
  if (!student) return null;
  return verifyPassword(password, student.passwordHash) ? student : null;
}

export function updatePlan(
  studentId: number,
  plan: { targetGpa: number | null; degreeUnits: number },
): void {
  db.update(students).set(plan).where(eq(students.id, studentId)).run();
}
