import type { APIRoute } from "astro";
import { parseRosterCsv } from "../../../../../lib/csv";
import {
  addItem,
  deleteOffering,
  enrol,
  getOffering,
  normaliseUniId,
  saveGrades,
  scoreKey,
  UNI_ID_PATTERN,
  unenrol,
  updateOffering,
} from "../../../../../lib/data";
import { notifyChanged } from "../../../../../lib/events";
import { text, withMessage } from "../../../../../lib/forms";
import { finalMark, gradeForMark, isGrade } from "../../../../../lib/grading";
import { csvText, parseItem, parseOffering } from "../../../../../lib/staff-forms";

// One endpoint per offering; the form's `_action` says what to do. Every
// data call passes the convenor's id, so another convenor's offering 404s.
export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const staff = locals.user!;
  const offeringId = Number(params.id);
  const offering = getOffering(staff.id, offeringId);
  if (!offering) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const page = `/staff/offerings/${offeringId}/`;
  const back = (kind: "error" | "notice", message: string, hash = "") =>
    redirect(withMessage(page + hash, kind, message), 303);
  const toClassList = (kind: "error" | "notice", message: string) =>
    redirect(withMessage(`${page}students/`, kind, message), 303);
  const notify = () => notifyChanged([staff.uniId, ...(getOffering(staff.id, offeringId)?.enrolments ?? []).map((e) => e.uniId)]);

  switch (String(form.get("_action"))) {
    case "update": {
      const parsed = parseOffering(form);
      if (!parsed.ok) return back("error", parsed.error, "#details");
      updateOffering(staff.id, offeringId, parsed.value);
      notify();
      return back("notice", "Course details saved.");
    }
    case "delete": {
      const uniIds = offering.enrolments.map((e) => e.uniId);
      deleteOffering(staff.id, offeringId);
      notifyChanged([staff.uniId, ...uniIds]);
      return redirect(withMessage("/staff/", "notice", `Deleted ${offering.code} (${offering.year}).`), 303);
    }
    case "add-item": {
      const parsed = parseItem(form);
      if (!parsed.ok) return back("error", parsed.error, "#add-item");
      addItem(staff.id, offeringId, parsed.value);
      notify();
      return back("notice", `Added ${parsed.value.name}. Students see it as "Not released" until you release it.`, "#items");
    }
    case "enrol": {
      const uniId = normaliseUniId(String(form.get("uniId") ?? ""));
      if (!UNI_ID_PATTERN.test(uniId)) return toClassList("error", "A uni ID looks like u1234567.");
      const name = text(form, "name", "Student name", 80);
      if (!name.ok) return toClassList("error", name.error);
      if (!enrol(staff.id, offeringId, uniId, name.value)) return toClassList("error", `${uniId} is already enrolled.`);
      notify();
      return toClassList("notice", `Enrolled ${name.value}.`);
    }
    case "enrol-csv": {
      const { rows, problems } = parseRosterCsv(await csvText(form));
      let added = 0;
      for (const r of rows) if (enrol(staff.id, offeringId, r.uniId, r.name)) added++;
      notify();
      const skipped = rows.length - added;
      const message =
        `Enrolled ${added} student${added === 1 ? "" : "s"}.` +
        (skipped ? ` ${skipped} already enrolled.` : "") +
        (problems.length ? ` Skipped line${problems.length === 1 ? "" : "s"} ${problems.map((p) => p.line).join(", ")}: ${problems[0].reason}.` : "");
      return toClassList(problems.length && !added ? "error" : "notice", message);
    }
    case "unenrol": {
      const enrolment = offering.enrolments.find((e) => e.id === Number(form.get("enrolmentId")));
      if (!enrolment) return toClassList("error", "Pick a student to remove.");
      unenrol(staff.id, offeringId, enrolment.id);
      notifyChanged([staff.uniId, enrolment.uniId]);
      return toClassList("notice", `Removed ${enrolment.name} and their marks.`);
    }
    case "save-grades": {
      const entries = offering.enrolments.map((e) => {
        const raw = String(form.get(`grade-${e.id}`) ?? "");
        return { enrolmentId: e.id, grade: raw && isGrade(raw) ? raw : null };
      });
      saveGrades(staff.id, offeringId, entries);
      notify();
      return back("notice", "Final grades saved. Students see a grade as soon as it's set.", "#students");
    }
    case "fill-grades": {
      // suggest a grade from the marks for anyone fully marked without one
      const entries = offering.enrolments.flatMap((e) => {
        if (e.grade) return [];
        const items = offering.items.map((i) => ({ weight: i.weight, outOf: i.outOf, score: offering.scores.get(scoreKey(i.id, e.id)) ?? null }));
        const mark = finalMark(items);
        return mark === null ? [] : [{ enrolmentId: e.id, grade: gradeForMark(mark) as string }];
      });
      saveGrades(staff.id, offeringId, entries);
      notify();
      return back(
        "notice",
        entries.length
          ? `Filled ${entries.length} grade${entries.length === 1 ? "" : "s"} from marks. Check them before the release date.`
          : "Nobody is fully marked without a grade yet.",
        "#students",
      );
    }
    default:
      return back("error", "Something went wrong with that form. Try again.");
  }
};
