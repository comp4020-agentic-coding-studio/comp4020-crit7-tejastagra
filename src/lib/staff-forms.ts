// Parsing the staff forms (offering details, assessment items), so every
// endpoint that takes them enforces the same rules.
import type { ItemInput, OfferingInput } from "./data/staff";
import { number, type Parsed, text } from "./forms";
import { TERMS, type Term } from "./schema";

export function parseOffering(form: FormData): Parsed<OfferingInput> {
  const code = text(form, "code", "Course code", 12);
  if (!code.ok) return code;
  const title = text(form, "title", "Course name", 120);
  if (!title.ok) return title;
  const units = number(form, "units", "Units", { min: 1, max: 48 });
  if (!units.ok) return units;
  const year = number(form, "year", "Year", { min: 1994, max: 2100 });
  if (!year.ok) return year;
  const term = String(form.get("term") ?? "");
  if (!(TERMS as readonly string[]).includes(term)) return { ok: false, error: "Pick a session." };
  return {
    ok: true,
    value: {
      code: code.value.toUpperCase().replace(/\s+/g, ""),
      title: title.value,
      units: Math.round(units.value!),
      year: Math.round(year.value!),
      term: term as Term,
    },
  };
}

export function parseItem(form: FormData): Parsed<ItemInput> {
  const name = text(form, "name", "Assessment name", 80);
  if (!name.ok) return name;
  const weight = number(form, "weight", "Weight", { min: 0, max: 100 });
  if (!weight.ok) return weight;
  const outOf = number(form, "outOf", "Out of", { min: 0.5, max: 1000 });
  if (!outOf.ok) return outOf;
  return { ok: true, value: { name: name.value, weight: weight.value!, outOf: outOf.value! } };
}

/** An uploaded CSV: a file input's contents if one was chosen, else the
 *  pasted text. */
export async function csvText(form: FormData): Promise<string> {
  const file = form.get("file");
  if (file instanceof File && file.size > 0) return (await file.text()).slice(0, 200_000);
  return String(form.get("csv") ?? "").slice(0, 200_000);
}
