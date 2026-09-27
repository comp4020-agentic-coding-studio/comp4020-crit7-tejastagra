import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../auth/password";
import { db } from "../db";
import { type Role, type User, users } from "../schema";

export type { Role, User };

/** ANU uni ids are a "u" followed by seven digits. */
export const UNI_ID_PATTERN = /^u\d{7}$/;

export function normaliseUniId(raw: string): string {
  return raw.trim().toLowerCase();
}

export function findUserByUniId(uniId: string): User | undefined {
  return db.select().from(users).where(eq(users.uniId, normaliseUniId(uniId))).get();
}

export function getUser(id: number): User | undefined {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function createUser(input: { uniId: string; name: string; password: string; role?: Role }): User {
  return db
    .insert(users)
    .values({
      uniId: normaliseUniId(input.uniId),
      name: input.name.trim(),
      role: input.role ?? "student",
      passwordHash: hashPassword(input.password),
    })
    .returning()
    .get();
}

export function authenticate(uniId: string, password: string): User | null {
  const user = findUserByUniId(uniId);
  if (!user) return null;
  return verifyPassword(password, user.passwordHash) ? user : null;
}

/** A student's own planning numbers: the only user fields they can write. */
export function updatePlan(userId: number, plan: { targetGpa: number | null; degreeUnits: number }): void {
  db.update(users).set(plan).where(eq(users.id, userId)).run();
}
