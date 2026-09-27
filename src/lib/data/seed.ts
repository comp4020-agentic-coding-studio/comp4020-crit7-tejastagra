import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { gradeForMark } from "../grading";
import { assessmentItems, enrolments, marks, offerings, type Term, users } from "../schema";
import { createUser, findUserByUniId, updatePlan } from "./users";

// The demo world, so a visitor or tutor can see both sides without typing
// anything in: a third-year computing student with a full history, the
// convenor who runs all of their courses (with a few classmates in each),
// and a second convenor with no offerings, who exists to prove staff can
// only touch their own courses. Course codes are real ANU courses; every
// mark, weight, name and grade is illustrative.

export const DEMO_STUDENT = { uniId: "u7654321", password: "demo1234", name: "Demo Student" };
export const DEMO_STAFF = { uniId: "u1000001", password: "staff1234", name: "Demo Convenor" };
export const OTHER_STAFF = { uniId: "u1000002", password: "staff1234", name: "Other Convenor" };
const DEMO_PLAN = { targetGpa: 5.5, degreeUnits: 144 };

type Item = [name: string, weight: number, outOf: number];

const TEMPLATES: Record<string, Item[]> = {
  exam: [
    ["Assignment 1", 15, 20],
    ["Assignment 2", 15, 20],
    ["Mid-semester exam", 20, 50],
    ["Final exam", 50, 100],
  ],
  project: [
    ["Lab participation", 10, 10],
    ["Assignment 1", 20, 100],
    ["Group project", 30, 100],
    ["Final exam", 40, 100],
  ],
  maths: [
    ["Weekly quizzes", 10, 10],
    ["Assignment 1", 10, 30],
    ["Assignment 2", 10, 30],
    ["Mid-semester exam", 20, 40],
    ["Final exam", 50, 100],
  ],
  capstone: [
    ["Project plan", 10, 10],
    ["Audit 1", 15, 100],
    ["Audit 2", 15, 100],
    ["Final showcase", 30, 100],
    ["Final report", 30, 100],
  ],
};

// small, fixed wiggles so marks look like real marks, not one number
const WIGGLE = [6, -4, 3, -2, 5];

/** Scores for a template whose weighted total lands on (about) `mark`. */
function scoresFor(template: Item[], mark: number, shift = 0): number[] {
  const pct = template.map((_, i) => Math.min(100, Math.max(0, mark + WIGGLE[(i + shift) % WIGGLE.length])));
  const lastWeight = template.at(-1)![1];
  const others = template.slice(0, -1).reduce((s, [, w], i) => s + (w * pct[i]) / 100, 0);
  pct[pct.length - 1] = Math.min(100, Math.max(0, ((mark - others) / lastWeight) * 100));
  return template.map(([, , outOf], i) => Math.round((pct[i] / 100) * outOf * 2) / 2);
}

interface SeedOffering {
  code: string;
  title: string;
  year: number;
  term: Term;
  units?: number;
  template: keyof typeof TEMPLATES;
  /** The demo student's released result; omit while in progress. */
  grade?: string;
  /** The demo student's final mark behind that grade. */
  mark?: number;
  /** In progress: items released so far, and the demo student's level. */
  marked?: { count: number; level: number };
  /** In progress: one more item marked by staff but not yet released. */
  unreleasedMarked?: boolean;
  target?: number;
}

const HISTORY: SeedOffering[] = [
  { code: "COMP1100", title: "Programming as Problem Solving", year: 2024, term: "S1", template: "project", grade: "HD", mark: 84 },
  { code: "COMP1600", title: "Foundations of Computing", year: 2024, term: "S1", template: "exam", grade: "D", mark: 74 },
  { code: "MATH1013", title: "Mathematics and Applications 1", year: 2024, term: "S1", template: "maths", grade: "CR", mark: 65 },
  { code: "ECON1101", title: "Microeconomics 1", year: 2024, term: "S1", template: "exam", grade: "P", mark: 58 },
  { code: "COMP1110", title: "Structured Programming", year: 2024, term: "S2", template: "project", grade: "D", mark: 77 },
  { code: "COMP2300", title: "Computer Organisation and Program Execution", year: 2024, term: "S2", template: "exam", grade: "HD", mark: 81 },
  { code: "MATH1014", title: "Mathematics and Applications 2", year: 2024, term: "S2", template: "maths", grade: "CR", mark: 62 },
  { code: "STAT1003", title: "Statistical Techniques", year: 2024, term: "S2", template: "maths", grade: "WD" },
  { code: "COMP2100", title: "Software Design Methodologies", year: 2025, term: "S1", template: "project", grade: "D", mark: 72 },
  { code: "COMP2120", title: "Software Engineering", year: 2025, term: "S1", template: "project", grade: "CR", mark: 68 },
  { code: "COMP2310", title: "Systems, Networks and Concurrency", year: 2025, term: "S1", template: "exam", grade: "N", mark: 44 },
  { code: "COMP2420", title: "Introduction to Data Management, Analysis and Security", year: 2025, term: "S1", template: "exam", grade: "HD", mark: 86 },
  { code: "COMP3600", title: "Algorithms", year: 2025, term: "S2", template: "exam", grade: "CR", mark: 64 },
  { code: "COMP2550", title: "Computing Research and Development Methods", year: 2025, term: "S2", template: "project", grade: "D", mark: 75 },
  { code: "COMP3500", title: "Software Engineering Project", year: 2025, term: "S2", units: 12, template: "capstone", grade: "D", mark: 78 },
  { code: "COMP2310", title: "Systems, Networks and Concurrency", year: 2026, term: "S1", template: "exam", grade: "P", mark: 57 },
  { code: "COMP3310", title: "Computer Networks", year: 2026, term: "S1", template: "exam", grade: "CR", mark: 66 },
  { code: "COMP3630", title: "Theory of Computation", year: 2026, term: "S1", template: "exam", grade: "D", mark: 71 },
  { code: "COMP3300", title: "Operating Systems Implementation", year: 2026, term: "S2", template: "exam", marked: { count: 3, level: 68 }, target: 70 },
  { code: "COMP3702", title: "Artificial Intelligence", year: 2026, term: "S2", template: "project", marked: { count: 2, level: 82 }, target: 80 },
  { code: "COMP3425", title: "Data Mining", year: 2026, term: "S2", template: "exam", marked: { count: 2, level: 61 } },
  { code: "COMP4020", title: "Agentic Coding Studio", year: 2026, term: "S2", template: "capstone", marked: { count: 3, level: 88 }, unreleasedMarked: true, target: 80 },
];

/** Classmates: uni IDs and names only (no accounts), with a typical level. */
const CLASSMATES = [
  { uniId: "u5512001", name: "Priya Nair", level: 88 },
  { uniId: "u5512002", name: "Liam O'Connor", level: 76 },
  { uniId: "u5512003", name: "Mei Tanaka", level: 69 },
  { uniId: "u5512004", name: "Ahmed Hassan", level: 63 },
  { uniId: "u5512005", name: "Sofia Rossi", level: 55 },
  { uniId: "u5512006", name: "Jack Nguyen", level: 47 },
  { uniId: "u5512007", name: "Grace Kim", level: 81 },
];

function seedOfferings(convenorId: number): void {
  db.transaction((tx) => {
    for (const [n, c] of HISTORY.entries()) {
      const offering = tx
        .insert(offerings)
        .values({ convenorId, code: c.code, title: c.title, units: c.units ?? 6, year: c.year, term: c.term })
        .returning()
        .get();
      const template = TEMPLATES[c.template];
      const inProgress = c.grade === undefined;
      const releasedCount = inProgress ? c.marked!.count : template.length;
      const markedCount = releasedCount + (c.unreleasedMarked ? 1 : 0);
      const items = tx
        .insert(assessmentItems)
        .values(
          template.map(([name, weight, outOf], i) => ({
            offeringId: offering.id,
            name,
            weight,
            outOf,
            position: i,
            released: i < releasedCount,
          })),
        )
        .returning()
        .all();

      const people = [
        {
          uniId: DEMO_STUDENT.uniId,
          name: DEMO_STUDENT.name,
          level: c.mark ?? c.marked?.level ?? 0,
          grade: c.grade ?? null,
          target: c.target ?? null,
          // a withdrawal stopped after the first item
          marked: c.grade === "WD" ? 1 : markedCount,
        },
        ...CLASSMATES.map((m, k) => {
          const level = Math.min(97, Math.max(20, m.level + WIGGLE[(n + k) % WIGGLE.length]));
          return {
            ...m,
            level,
            grade: inProgress ? null : gradeForMark(level),
            target: null,
            marked: markedCount,
          };
        }),
      ];
      for (const [k, p] of people.entries()) {
        const enrolment = tx
          .insert(enrolments)
          .values({ offeringId: offering.id, uniId: p.uniId, name: p.name, grade: p.grade, targetMark: p.target })
          .returning()
          .get();
        const scores = scoresFor(template, p.level, k);
        const rows = items.slice(0, p.marked).map((item, i) => ({ itemId: item.id, enrolmentId: enrolment.id, score: scores[i] }));
        if (rows.length > 0) tx.insert(marks).values(rows).run();
      }
    }
  });
}

/** Creates the demo accounts and their world, once. */
export function ensureDemoData(): void {
  if (findUserByUniId(DEMO_STAFF.uniId)) return;
  const staff = createUser({ ...DEMO_STAFF, role: "staff" });
  createUser({ ...OTHER_STAFF, role: "staff" });
  const student = findUserByUniId(DEMO_STUDENT.uniId) ?? createUser(DEMO_STUDENT);
  updatePlan(student.id, DEMO_PLAN);
  seedOfferings(staff.id);
}

export function isDemoAccount(uniId: string): boolean {
  return uniId === DEMO_STUDENT.uniId || uniId === DEMO_STAFF.uniId;
}

/** Puts the whole demo world back: the demo convenor's offerings, and the
 *  demo student's plan. Other convenors' data is untouched. */
export function resetDemoData(): void {
  const staff = findUserByUniId(DEMO_STAFF.uniId);
  const student = findUserByUniId(DEMO_STUDENT.uniId);
  if (!staff || !student) return;
  const mine = db.select({ id: offerings.id }).from(offerings).where(eq(offerings.convenorId, staff.id)).all();
  if (mine.length > 0) {
    db.delete(offerings)
      .where(
        inArray(
          offerings.id,
          mine.map((o) => o.id),
        ),
      )
      .run();
  }
  db.update(users).set(DEMO_PLAN).where(eq(users.id, student.id)).run();
  seedOfferings(staff.id);
}
