import { db } from "../db";
import { assessments, courses, type Term } from "../schema";
import { createStudent, findStudentByUniId, type Student, updatePlan } from "./students";
import { deleteAllCourses } from "./courses";

// The demo student: a third-year computing student with a full history, so a
// visitor or tutor can see every feature without typing a transcript in.
// Course codes are real ANU courses; the marks, weights and grades are
// illustrative, not anyone's transcript.
export const DEMO_UNI_ID = "u7654321";
export const DEMO_PASSWORD = "demo1234";
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
function scoresFor(template: Item[], mark: number): number[] {
  const pct = template.map((_, i) => Math.min(100, Math.max(0, mark + WIGGLE[i % WIGGLE.length])));
  // solve the last item so the weighted total lands on the mark
  const lastWeight = template.at(-1)![1];
  const others = template.slice(0, -1).reduce((s, [, w], i) => s + (w * pct[i]) / 100, 0);
  pct[pct.length - 1] = Math.min(100, Math.max(0, ((mark - others) / lastWeight) * 100));
  return template.map(([, , outOf], i) => Math.round((pct[i] / 100) * outOf * 2) / 2);
}

interface SeedCourse {
  code: string;
  title: string;
  year: number;
  term: Term;
  units?: number;
  template: keyof typeof TEMPLATES;
  /** Released result; omit for in-progress. */
  grade?: string;
  /** Final mark behind a released grade. */
  mark?: number;
  /** In progress: how many items are marked, and at what level. */
  marked?: { count: number; level: number };
  target?: number;
}

const HISTORY: SeedCourse[] = [
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
  { code: "COMP4020", title: "Agentic Coding Studio", year: 2026, term: "S2", template: "capstone", marked: { count: 3, level: 88 }, target: 80 },
];

export function seedCourses(studentId: number): void {
  db.transaction((tx) => {
    for (const c of HISTORY) {
      const course = tx
        .insert(courses)
        .values({
          studentId,
          code: c.code,
          title: c.title,
          units: c.units ?? 6,
          year: c.year,
          term: c.term,
          grade: c.grade ?? null,
          targetMark: c.target ?? null,
        })
        .returning()
        .get();
      const template = TEMPLATES[c.template];
      const level = c.mark ?? c.marked?.level ?? 0;
      const scores = scoresFor(template, level);
      // a withdrawal has no marks at all; in-progress has the first few
      const markedCount = c.grade === "WD" ? 1 : (c.marked?.count ?? template.length);
      tx.insert(assessments)
        .values(
          template.map(([name, weight, outOf], i) => ({
            courseId: course.id,
            name,
            weight,
            outOf,
            score: i < markedCount ? scores[i] : null,
            position: i,
          })),
        )
        .run();
    }
  });
}

/** Creates the demo student with a full history, once. */
export function ensureDemoStudent(): Student {
  const existing = findStudentByUniId(DEMO_UNI_ID);
  if (existing) return existing;
  const student = createStudent({ uniId: DEMO_UNI_ID, name: "Demo Student", password: DEMO_PASSWORD });
  seedCourses(student.id);
  updatePlan(student.id, DEMO_PLAN);
  return { ...student, ...DEMO_PLAN };
}

/** Puts the demo student's courses back to the seeded history. */
export function resetDemoStudent(studentId: number): void {
  deleteAllCourses(studentId);
  seedCourses(studentId);
  updatePlan(studentId, DEMO_PLAN);
}
