// Parsing for the app's plain HTML forms. Each parser returns a value or an
// error message worded for a student, never a thrown exception.

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function text(form: FormData, key: string, label: string, max = 200): Parsed<string> {
  const value = String(form.get(key) ?? "").trim();
  if (!value) return { ok: false, error: `${label} can't be empty.` };
  if (value.length > max) return { ok: false, error: `${label} is too long (max ${max} characters).` };
  return { ok: true, value };
}

export function number(
  form: FormData,
  key: string,
  label: string,
  { min, max, optional = false }: { min: number; max: number; optional?: boolean },
): Parsed<number | null> {
  const raw = String(form.get(key) ?? "").trim();
  if (raw === "") {
    return optional ? { ok: true, value: null } : { ok: false, error: `${label} is required.` };
  }
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value)) return { ok: false, error: `${label} must be a number.` };
  if (value < min || value > max) {
    return { ok: false, error: `${label} must be between ${min} and ${max}.` };
  }
  return { ok: true, value };
}

/** A same-site path to go back to, or the fallback. Never an external URL. */
export function safeNext(raw: FormDataEntryValue | null, fallback: string): string {
  const next = String(raw ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function withMessage(path: string, kind: "error" | "notice", message: string): string {
  const url = new URL(path, "http://x");
  url.searchParams.set(kind, message);
  return url.pathname + url.search + url.hash;
}
