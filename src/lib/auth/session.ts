import { createHash, randomBytes } from "node:crypto";
import type { AstroCookies } from "astro";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../db";
import { sessions } from "../schema";

// Sessions: a random token in an httpOnly cookie, with only its SHA-256 in
// the database, so a leaked database can't be replayed as logins.
export const SESSION_COOKIE = "grades_session";
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function startSession(cookies: AstroCookies, studentId: number, secure: boolean): void {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  // tidy up expired sessions whenever someone logs in
  db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString())).run();
  db.insert(sessions)
    .values({ tokenHash: hashToken(token), studentId, expiresAt: expires.toISOString() })
    .run();
  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    expires,
  });
}

/** The student id behind the request's session cookie, if it's valid. */
export function sessionStudentId(cookies: AstroCookies): number | null {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db
    .select({ studentId: sessions.studentId })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date().toISOString())))
    .get();
  return row?.studentId ?? null;
}

export function endSession(cookies: AstroCookies): void {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).run();
  cookies.delete(SESSION_COOKIE, { path: "/" });
}
