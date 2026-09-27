import { describe, expect, it } from "vitest";
import {
  applyScenario,
  calculateGpa,
  courseStanding,
  exampleGradeMix,
  finalMark,
  type Grade,
  gradeForMark,
  gradePoints,
  neededForTarget,
  planTargetGpa,
} from "../src/lib/grading";

// The ANU rules from docs/harness/anu-rules.md, as contracts. These are the
// numbers a student makes enrolment decisions off, so they're tested with no
// server, database or browser in the way.

describe("grading scale", () => {
  it.each([
    [100, "HD"],
    [80, "HD"],
    [79.9, "D"],
    [70, "D"],
    [69.6, "CR"],
    [60, "CR"],
    [59, "P"],
    [50, "P"],
    [49.9, "N"],
    [0, "N"],
  ])("a mark of %d is %s (no rounding up)", (mark, grade) => {
    expect(gradeForMark(mark)).toBe(grade);
  });

  it("gives the published grade points", () => {
    expect(gradePoints("HD")).toBe(7);
    expect(gradePoints("D")).toBe(6);
    expect(gradePoints("CR")).toBe(5);
    expect(gradePoints("P")).toBe(4);
    expect(gradePoints("PS")).toBe(4);
    for (const fail of ["N", "NCN", "WN"] as const) expect(gradePoints(fail)).toBe(0);
  });

  it("excludes non-graded results from GPA", () => {
    for (const g of ["WD", "WL", "CRS", "CRN", "HLP", "DA", "PX", "RP", "WA", "WF", "EE", "STI", "STE"] as const) {
      expect(gradePoints(g), g).toBeNull();
    }
  });
});

describe("GPA", () => {
  it("reproduces the ANU GPA page's worked example: 300 / 72 = 4.167", () => {
    const results: { grade: Grade; units: number }[] = [
      { grade: "CR", units: 6 },
      { grade: "D", units: 6 },
      { grade: "P", units: 6 },
      { grade: "PS", units: 6 },
      { grade: "N", units: 12 },
      { grade: "CRS", units: 6 },
      { grade: "DA", units: 6 },
      { grade: "CR", units: 12 },
      { grade: "HD", units: 18 },
      { grade: "NCN", units: 6 },
    ];
    expect(calculateGpa(results)).toEqual({ gpa: 4.167, points: 300, units: 72 });
  });

  it("counts fails as units with no points", () => {
    expect(calculateGpa([{ grade: "HD", units: 6 }, { grade: "N", units: 6 }]).gpa).toBe(3.5);
  });

  it("rounds to three decimal places", () => {
    expect(calculateGpa([{ grade: "HD", units: 6 }, { grade: "D", units: 6 }, { grade: "D", units: 6 }]).gpa).toBe(6.333);
  });

  it("has no GPA with no counting units", () => {
    expect(calculateGpa([{ grade: "CRS", units: 6 }]).gpa).toBeNull();
  });
});

describe("course standing and what's needed", () => {
  const items = [
    { weight: 20, score: 16, outOf: 20 }, // 80% → 16 marks
    { weight: 30, score: 21, outOf: 30 }, // 70% → 21 marks
    { weight: 50, score: null, outOf: 100 },
  ];

  it("banks weighted marks and tracks the grade", () => {
    const s = courseStanding(items);
    expect(s.secured).toBeCloseTo(37);
    expect(s.weightRemaining).toBe(50);
    expect(s.averageSoFar).toBeCloseTo(74);
    expect(s.trackingGrade).toBe("D");
    expect(s.maxPossible).toBeCloseTo(87);
    expect(s.weightsSumTo100).toBe(true);
  });

  it("works out the average needed on remaining work", () => {
    const r = neededForTarget(items, 70);
    expect(r.status).toBe("possible");
    expect(r.neededPercent).toBeCloseTo(66);
  });

  it("says when a target is out of reach", () => {
    expect(neededForTarget(items, 90).status).toBe("out-of-reach");
  });

  it("says when a target is already secured", () => {
    expect(neededForTarget(items, 35).status).toBe("secured");
  });

  it("says when the course is finished short of the target", () => {
    const done = [{ weight: 100, score: 55, outOf: 100 }];
    expect(neededForTarget(done, 60).status).toBe("finished");
    expect(finalMark(done)).toBe(55);
  });

  it("flags weights that don't add up to 100", () => {
    expect(courseStanding([{ weight: 40, score: null, outOf: 10 }]).weightsSumTo100).toBe(false);
  });
});

describe("what-if scenarios", () => {
  const items = [
    { id: 1, weight: 50, score: 40, outOf: 50 }, // 40 marks banked
    { id: 2, weight: 50, score: null, outOf: 100 },
  ];

  it("fills in a hypothetical score and finishes the course", () => {
    const scenario = applyScenario(items, new Map([[2, 60]]));
    expect(finalMark(scenario)).toBe(70);
    expect(gradeForMark(finalMark(scenario)!)).toBe("D");
  });

  it("never overrides a released mark", () => {
    const scenario = applyScenario(items, new Map([[1, 0]]));
    expect(scenario[0].score).toBe(40);
  });

  it("clamps a hypothetical score to what the item is out of", () => {
    expect(applyScenario(items, new Map([[2, 150]]))[1].score).toBe(100);
  });

  it("leaves the originals untouched", () => {
    applyScenario(items, new Map([[2, 60]]));
    expect(items[1].score).toBeNull();
  });
});

describe("target GPA planner", () => {
  it("finds the average grade points needed on remaining units", () => {
    // 48 units at 5.5 = 264 points; 96 more units; target 6
    const r = planTargetGpa({ points: 264, units: 48, remainingUnits: 96, target: 6 });
    expect(r.status).toBe("possible");
    expect(r.neededAverage).toBeCloseTo(6.25);
    expect(r.bestPossible).toBe(6.5);
  });

  it("says a target above what straight HDs can reach is out of reach", () => {
    const r = planTargetGpa({ points: 192, units: 48, remainingUnits: 24, target: 6 });
    expect(r.status).toBe("out-of-reach");
  });

  it("says a target is secured when even fails keep it", () => {
    const r = planTargetGpa({ points: 336, units: 48, remainingUnits: 6, target: 5 });
    expect(r.status).toBe("secured");
  });

  it("offers a two-grade example mix that reaches the average", () => {
    const mix = exampleGradeMix(6.25, 16);
    expect(mix).toEqual({ higher: { grade: "HD", courses: 4 }, lower: { grade: "D", courses: 12 } });
  });
});
