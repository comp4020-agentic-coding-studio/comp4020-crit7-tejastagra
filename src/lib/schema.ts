import { sql } from "drizzle-orm";
import { int, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.
// The model and who may write what: docs/harness/architecture.md.

export const ROLES = ["student", "staff"] as const;
export type Role = (typeof ROLES)[number];

export const users = sqliteTable("users", {
  id: int().primaryKey({ autoIncrement: true }),
  /** ANU uni id, e.g. u1234567 — the login name, and the enrolment key. */
  uniId: text("uni_id").notNull().unique(),
  name: text().notNull(),
  role: text({ enum: ROLES }).notNull().default("student"),
  passwordHash: text("password_hash").notNull(),
  /** Student planning: the GPA they're aiming for. */
  targetGpa: real("target_gpa"),
  /** Student planning: total units in the degree (144 = 3-year bachelor). */
  degreeUnits: int("degree_units").notNull().default(144),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const authSessions = sqliteTable("auth_sessions", {
  /** SHA-256 of the cookie token; the token itself is never stored. */
  tokenHash: text("token_hash").primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
});

export const TERMS = ["Summer", "S1", "Autumn", "Winter", "S2", "Spring"] as const;
export type Term = (typeof TERMS)[number];

/** A course as run in one session, convened by one staff member. */
export const offerings = sqliteTable("offerings", {
  id: int().primaryKey({ autoIncrement: true }),
  convenorId: int("convenor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: text().notNull(),
  title: text().notNull(),
  units: int().notNull().default(6),
  year: int().notNull(),
  term: text({ enum: TERMS }).notNull(),
});

export const assessmentItems = sqliteTable("assessment_items", {
  id: int().primaryKey({ autoIncrement: true }),
  offeringId: int("offering_id")
    .notNull()
    .references(() => offerings.id, { onDelete: "cascade" }),
  name: text().notNull(),
  /** Percentage of the course mark. */
  weight: real().notNull(),
  outOf: real("out_of").notNull().default(100),
  position: int().notNull().default(0),
  /** Students only see marks for released items. */
  released: int({ mode: "boolean" }).notNull().default(false),
});

/** A student in an offering, keyed by uni ID so staff can enrol and mark
 *  students who haven't logged in yet. */
export const enrolments = sqliteTable(
  "enrolments",
  {
    id: int().primaryKey({ autoIncrement: true }),
    offeringId: int("offering_id")
      .notNull()
      .references(() => offerings.id, { onDelete: "cascade" }),
    uniId: text("uni_id").notNull(),
    name: text().notNull(),
    /** The released final result (HD, D, CRS, WD, ...); null until then. */
    grade: text(),
    /** The student's own target course mark: the one field they can write. */
    targetMark: real("target_mark"),
  },
  (t) => [uniqueIndex("enrolments_offering_uni").on(t.offeringId, t.uniId)],
);

export const marks = sqliteTable(
  "marks",
  {
    id: int().primaryKey({ autoIncrement: true }),
    itemId: int("item_id")
      .notNull()
      .references(() => assessmentItems.id, { onDelete: "cascade" }),
    enrolmentId: int("enrolment_id")
      .notNull()
      .references(() => enrolments.id, { onDelete: "cascade" }),
    score: real().notNull(),
  },
  (t) => [uniqueIndex("marks_item_enrolment").on(t.itemId, t.enrolmentId)],
);

export type User = typeof users.$inferSelect;
export type Offering = typeof offerings.$inferSelect;
export type AssessmentItem = typeof assessmentItems.$inferSelect;
export type Enrolment = typeof enrolments.$inferSelect;
export type Mark = typeof marks.$inferSelect;
