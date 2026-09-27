import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  type AssessmentItem,
  assessmentItems,
  type Enrolment,
  enrolments,
  marks,
  type Offering,
  offerings,
  type Term,
} from "../schema";

// The staff side: convenors manage their own offerings. Every function takes
// the convenor's user id and checks the offering is theirs before reading or
// writing anything under it (docs/harness/architecture.md).

export type { AssessmentItem, Enrolment, Offering };

export interface OfferingInput {
  code: string;
  title: string;
  units: number;
  year: number;
  term: Term;
}

export interface ItemInput {
  name: string;
  weight: number;
  outOf: number;
}

export interface OfferingSummary extends Offering {
  students: number;
  items: number;
  released: number;
  graded: number;
}

export interface OfferingDetail extends Offering {
  items: AssessmentItem[];
  enrolments: Enrolment[];
  /** score by `${itemId}:${enrolmentId}` */
  scores: Map<string, number>;
}

export const scoreKey = (itemId: number, enrolmentId: number) => `${itemId}:${enrolmentId}`;

export function listOfferings(convenorId: number): OfferingSummary[] {
  const rows = db.select().from(offerings).where(eq(offerings.convenorId, convenorId)).all();
  if (rows.length === 0) return [];
  const ids = rows.map((o) => o.id);
  const itemCounts = db
    .select({
      offeringId: assessmentItems.offeringId,
      items: sql<number>`count(*)`,
      released: sql<number>`sum(${assessmentItems.released})`,
    })
    .from(assessmentItems)
    .where(inArray(assessmentItems.offeringId, ids))
    .groupBy(assessmentItems.offeringId)
    .all();
  const enrolCounts = db
    .select({
      offeringId: enrolments.offeringId,
      students: sql<number>`count(*)`,
      graded: sql<number>`count(${enrolments.grade})`,
    })
    .from(enrolments)
    .where(inArray(enrolments.offeringId, ids))
    .groupBy(enrolments.offeringId)
    .all();
  return rows.map((o) => {
    const i = itemCounts.find((c) => c.offeringId === o.id);
    const e = enrolCounts.find((c) => c.offeringId === o.id);
    return {
      ...o,
      items: i?.items ?? 0,
      released: i?.released ?? 0,
      students: e?.students ?? 0,
      graded: e?.graded ?? 0,
    };
  });
}

function ownedOffering(convenorId: number, offeringId: number): Offering | undefined {
  return db
    .select()
    .from(offerings)
    .where(and(eq(offerings.id, offeringId), eq(offerings.convenorId, convenorId)))
    .get();
}

export function getOffering(convenorId: number, offeringId: number): OfferingDetail | undefined {
  const offering = ownedOffering(convenorId, offeringId);
  if (!offering) return undefined;
  const items = db
    .select()
    .from(assessmentItems)
    .where(eq(assessmentItems.offeringId, offeringId))
    .orderBy(asc(assessmentItems.position), asc(assessmentItems.id))
    .all();
  const roster = db
    .select()
    .from(enrolments)
    .where(eq(enrolments.offeringId, offeringId))
    .orderBy(asc(enrolments.name))
    .all();
  const scores = new Map<string, number>();
  if (items.length > 0) {
    const rows = db
      .select()
      .from(marks)
      .where(
        inArray(
          marks.itemId,
          items.map((i) => i.id),
        ),
      )
      .all();
    for (const m of rows) scores.set(scoreKey(m.itemId, m.enrolmentId), m.score);
  }
  return { ...offering, items, enrolments: roster, scores };
}

export function createOffering(convenorId: number, input: OfferingInput): Offering {
  return db
    .insert(offerings)
    .values({ ...input, convenorId })
    .returning()
    .get();
}

export function updateOffering(convenorId: number, offeringId: number, input: OfferingInput): boolean {
  const res = db
    .update(offerings)
    .set(input)
    .where(and(eq(offerings.id, offeringId), eq(offerings.convenorId, convenorId)))
    .run();
  return res.changes > 0;
}

export function deleteOffering(convenorId: number, offeringId: number): boolean {
  const res = db
    .delete(offerings)
    .where(and(eq(offerings.id, offeringId), eq(offerings.convenorId, convenorId)))
    .run();
  return res.changes > 0;
}

export function addItem(convenorId: number, offeringId: number, input: ItemInput): AssessmentItem | null {
  if (!ownedOffering(convenorId, offeringId)) return null;
  const [{ n }] = db
    .select({ n: sql<number>`count(*)` })
    .from(assessmentItems)
    .where(eq(assessmentItems.offeringId, offeringId))
    .all();
  return db
    .insert(assessmentItems)
    .values({ ...input, offeringId, position: n })
    .returning()
    .get();
}

export function updateItem(
  convenorId: number,
  offeringId: number,
  itemId: number,
  input: Partial<ItemInput> & { released?: boolean },
): boolean {
  if (!ownedOffering(convenorId, offeringId)) return false;
  const res = db
    .update(assessmentItems)
    .set(input)
    .where(and(eq(assessmentItems.id, itemId), eq(assessmentItems.offeringId, offeringId)))
    .run();
  return res.changes > 0;
}

export function deleteItem(convenorId: number, offeringId: number, itemId: number): boolean {
  if (!ownedOffering(convenorId, offeringId)) return false;
  const res = db
    .delete(assessmentItems)
    .where(and(eq(assessmentItems.id, itemId), eq(assessmentItems.offeringId, offeringId)))
    .run();
  return res.changes > 0;
}

/** Enrol a student by uni ID (they needn't have an account yet). Returns
 *  false if the offering isn't this convenor's or they're already in it. */
export function enrol(convenorId: number, offeringId: number, uniId: string, name: string): boolean {
  if (!ownedOffering(convenorId, offeringId)) return false;
  const res = db
    .insert(enrolments)
    .values({ offeringId, uniId, name })
    .onConflictDoNothing()
    .run();
  return res.changes > 0;
}

export function unenrol(convenorId: number, offeringId: number, enrolmentId: number): boolean {
  if (!ownedOffering(convenorId, offeringId)) return false;
  const res = db
    .delete(enrolments)
    .where(and(eq(enrolments.id, enrolmentId), eq(enrolments.offeringId, offeringId)))
    .run();
  return res.changes > 0;
}

export interface MarkEntry {
  enrolmentId: number;
  /** null clears the mark */
  score: number | null;
}

/** Save marks for one item. Entries for enrolments outside the offering are
 *  ignored. Returns how many were written. */
export function saveMarks(convenorId: number, offeringId: number, itemId: number, entries: MarkEntry[]): number {
  const offering = getOffering(convenorId, offeringId);
  const item = offering?.items.find((i) => i.id === itemId);
  if (!offering || !item) return 0;
  const inOffering = new Set(offering.enrolments.map((e) => e.id));
  let written = 0;
  db.transaction((tx) => {
    for (const { enrolmentId, score } of entries) {
      if (!inOffering.has(enrolmentId)) continue;
      if (score === null) {
        tx.delete(marks)
          .where(and(eq(marks.itemId, itemId), eq(marks.enrolmentId, enrolmentId)))
          .run();
      } else {
        tx.insert(marks)
          .values({ itemId, enrolmentId, score })
          .onConflictDoUpdate({ target: [marks.itemId, marks.enrolmentId], set: { score } })
          .run();
      }
      written++;
    }
  });
  return written;
}

export interface GradeEntry {
  enrolmentId: number;
  grade: string | null;
}

export function saveGrades(convenorId: number, offeringId: number, entries: GradeEntry[]): number {
  if (!ownedOffering(convenorId, offeringId)) return 0;
  let written = 0;
  db.transaction((tx) => {
    for (const { enrolmentId, grade } of entries) {
      const res = tx
        .update(enrolments)
        .set({ grade })
        .where(and(eq(enrolments.id, enrolmentId), eq(enrolments.offeringId, offeringId)))
        .run();
      written += res.changes;
    }
  });
  return written;
}
