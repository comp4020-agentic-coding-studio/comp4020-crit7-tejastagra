// Parsing the CSVs staff upload: marks for one assessment ("uni_id,score")
// and class lists ("uni_id,name"). Pure, so it's tested without a server.
// A header row is optional; blank lines are skipped; every problem row is
// reported back with its line number rather than silently dropped.

export interface CsvProblem {
  line: number;
  text: string;
  reason: string;
}

export interface Parsed<T> {
  rows: T[];
  problems: CsvProblem[];
}

const UNI_ID = /^u\d{7}$/;

function splitLine(line: string): string[] {
  // Enough CSV for what staff export from a spreadsheet: comma, semicolon or
  // tab separated, optionally double-quoted cells.
  return line.split(/[,;\t]/).map((cell) => cell.trim().replace(/^"(.*)"$/, "$1").trim());
}

function lines(text: string): { line: number; text: string }[] {
  return text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((t, i) => ({ line: i + 1, text: t.trim() }))
    .filter((l) => l.text !== "");
}

const isHeader = (cells: string[]) => !UNI_ID.test(cells[0].toLowerCase()) && /id|uni|student/i.test(cells[0]);

export function parseMarksCsv(text: string, outOf: number): Parsed<{ uniId: string; score: number | null }> {
  const rows: { uniId: string; score: number | null }[] = [];
  const problems: CsvProblem[] = [];
  for (const [index, l] of lines(text).entries()) {
    const cells = splitLine(l.text);
    if (index === 0 && isHeader(cells)) continue;
    const uniId = cells[0].toLowerCase();
    if (!UNI_ID.test(uniId)) {
      problems.push({ ...l, reason: "first column isn't a uni ID like u1234567" });
      continue;
    }
    const raw = cells[1] ?? "";
    if (raw === "") {
      rows.push({ uniId, score: null });
      continue;
    }
    const score = Number(raw.replace(",", "."));
    if (!Number.isFinite(score)) {
      problems.push({ ...l, reason: "mark isn't a number" });
    } else if (score < 0 || score > outOf) {
      problems.push({ ...l, reason: `mark must be between 0 and ${outOf}` });
    } else {
      rows.push({ uniId, score });
    }
  }
  return { rows, problems };
}

export function parseRosterCsv(text: string): Parsed<{ uniId: string; name: string }> {
  const rows: { uniId: string; name: string }[] = [];
  const problems: CsvProblem[] = [];
  for (const [index, l] of lines(text).entries()) {
    const cells = splitLine(l.text);
    if (index === 0 && isHeader(cells)) continue;
    const uniId = cells[0].toLowerCase();
    const name = cells.slice(1).join(" ").trim();
    if (!UNI_ID.test(uniId)) problems.push({ ...l, reason: "first column isn't a uni ID like u1234567" });
    else if (!name) problems.push({ ...l, reason: "missing the student's name" });
    else rows.push({ uniId, name: name.slice(0, 80) });
  }
  return { rows, problems };
}
