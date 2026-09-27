// How numbers read on screen (docs/harness/ux-mobile.md): GPAs to three
// decimal places, as ANU reports them; marks to at most one.

export function fmtGpa(gpa: number | null): string {
  return gpa === null ? "—" : gpa.toFixed(3);
}

export function fmtMark(mark: number): string {
  const rounded = Math.round(mark * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function fmtPercent(value: number): string {
  return `${fmtMark(value)}%`;
}

/** A needed score rounded UP to the nearest half mark, so hitting it is
 *  enough (rounding down would promise a target the student then misses). */
export function neededScore(percent: number, outOf: number): string {
  return fmtMark(Math.ceil(((percent / 100) * outOf - 1e-9) * 2) / 2);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
