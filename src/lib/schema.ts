import { sql } from "drizzle-orm";
import { int, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

export const students = sqliteTable("students", {
  id: int().primaryKey({ autoIncrement: true }),
  /** ANU uni id, e.g. u1234567 — the login name. */
  uniId: text("uni_id").notNull().unique(),
  name: text().notNull(),
  passwordHash: text("password_hash").notNull(),
  targetGpa: real("target_gpa"),
  /** Total units in the degree, for the GPA planner (144 = 3-year bachelor). */
  degreeUnits: int("degree_units").notNull().default(144),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sessions = sqliteTable("sessions", {
  /** SHA-256 of the cookie token; the token itself is never stored. */
  tokenHash: text("token_hash").primaryKey(),
  studentId: int("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
});

export const TERMS = ["Summer", "S1", "Autumn", "Winter", "S2", "Spring"] as const;
export type Term = (typeof TERMS)[number];

export const courses = sqliteTable("courses", {
  id: int().primaryKey({ autoIncrement: true }),
  studentId: int("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  code: text().notNull(),
  title: text().notNull(),
  units: int().notNull().default(6),
  year: int().notNull(),
  term: text({ enum: TERMS }).notNull(),
  /** The released result (HD, D, CRS, WD, ...); null while in progress. */
  grade: text(),
  /** The course mark the student is aiming for, out of 100. */
  targetMark: real("target_mark"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const assessments = sqliteTable("assessments", {
  id: int().primaryKey({ autoIncrement: true }),
  courseId: int("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  name: text().notNull(),
  /** Percentage of the course mark. */
  weight: real().notNull(),
  /** Null until the mark is released. */
  score: real(),
  outOf: real("out_of").notNull().default(100),
  position: int().notNull().default(0),
});

export type Student = typeof students.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
