import { describe, expect, it } from "vitest";
import { parseMarksCsv, parseRosterCsv } from "../src/lib/csv";

// Staff upload marks and class lists as CSV exported from a spreadsheet.
// The contract: good rows go in, and every bad row comes back with its line
// number and a reason, never silently dropped.

describe("marks CSV", () => {
  it("reads uni_id,score rows, with or without a header", () => {
    const withHeader = parseMarksCsv("uni_id,score\nu1234567,17\nU7654321, 18.5\n", 20);
    expect(withHeader.rows).toEqual([
      { uniId: "u1234567", score: 17 },
      { uniId: "u7654321", score: 18.5 },
    ]);
    expect(parseMarksCsv("u1234567,17", 20).rows).toHaveLength(1);
  });

  it("accepts spreadsheet quirks: quotes, semicolons, tabs, a BOM, CRLF", () => {
    const text = '﻿"u1234567";"12"\r\nu7654321\t15\r\n';
    expect(parseMarksCsv(text, 20).rows).toEqual([
      { uniId: "u1234567", score: 12 },
      { uniId: "u7654321", score: 15 },
    ]);
  });

  it("treats a blank mark as clearing it", () => {
    expect(parseMarksCsv("u1234567,", 20).rows).toEqual([{ uniId: "u1234567", score: null }]);
  });

  it("reports bad rows with their line numbers", () => {
    const { rows, problems } = parseMarksCsv("u1234567,17\nbob,12\nu7654321,25\nu7654322,abc", 20);
    expect(rows).toHaveLength(1);
    expect(problems.map((p) => p.line)).toEqual([2, 3, 4]);
    expect(problems[1].reason).toContain("between 0 and 20");
  });
});

describe("class list CSV", () => {
  it("reads uni_id,name rows", () => {
    const { rows, problems } = parseRosterCsv("Student ID,Name\nu1234567,Priya Nair\nu7654321");
    expect(rows).toEqual([{ uniId: "u1234567", name: "Priya Nair" }]);
    expect(problems).toHaveLength(1);
  });
});
