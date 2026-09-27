import type { APIRoute } from "astro";
import { parseMarksCsv } from "../../../../../../lib/csv";
import { deleteItem, getOffering, type MarkEntry, saveMarks, updateItem } from "../../../../../../lib/data";
import { notifyChanged } from "../../../../../../lib/events";
import { withMessage } from "../../../../../../lib/forms";
import { csvText, parseItem } from "../../../../../../lib/staff-forms";

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const staff = locals.user!;
  const offeringId = Number(params.id);
  const offering = getOffering(staff.id, offeringId);
  const item = offering?.items.find((i) => i.id === Number(params.itemId));
  if (!offering || !item) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const page = `/staff/offerings/${offeringId}/items/${item.id}/`;
  const back = (kind: "error" | "notice", message: string, hash = "") =>
    redirect(withMessage(page + hash, kind, message), 303);
  const notify = () => notifyChanged([staff.uniId, ...offering.enrolments.map((e) => e.uniId)]);

  switch (String(form.get("_action"))) {
    case "save-marks": {
      const entries: MarkEntry[] = [];
      const bad: string[] = [];
      for (const e of offering.enrolments) {
        const raw = String(form.get(`score-${e.id}`) ?? "").trim();
        if (raw === "") {
          entries.push({ enrolmentId: e.id, score: null });
          continue;
        }
        const score = Number(raw.replace(",", "."));
        if (!Number.isFinite(score) || score < 0 || score > item.outOf) bad.push(e.name);
        else entries.push({ enrolmentId: e.id, score });
      }
      if (bad.length) {
        return back("error", `Marks must be between 0 and ${item.outOf}. Check: ${bad.join(", ")}. Nothing was saved.`, "#marks");
      }
      saveMarks(staff.id, offeringId, item.id, entries);
      notify();
      return back("notice", item.released ? "Marks saved. Students can see them now." : "Marks saved. Students won't see them until you release this item.", "#marks");
    }
    case "upload-marks": {
      const { rows, problems } = parseMarksCsv(await csvText(form), item.outOf);
      const byUni = new Map(offering.enrolments.map((e) => [e.uniId, e.id]));
      const unknown = rows.filter((r) => !byUni.has(r.uniId)).map((r) => r.uniId);
      const entries = rows.flatMap((r) => (byUni.has(r.uniId) ? [{ enrolmentId: byUni.get(r.uniId)!, score: r.score }] : []));
      saveMarks(staff.id, offeringId, item.id, entries);
      notify();
      const parts = [`Uploaded ${entries.length} mark${entries.length === 1 ? "" : "s"}.`];
      if (unknown.length) parts.push(`Not enrolled, so skipped: ${unknown.join(", ")}.`);
      if (problems.length) parts.push(`Problem line${problems.length === 1 ? "" : "s"} ${problems.map((p) => p.line).join(", ")}: ${problems[0].reason}.`);
      return back(entries.length === 0 ? "error" : "notice", parts.join(" "), "#upload");
    }
    case "release":
    case "hide": {
      const released = form.get("_action") === "release";
      updateItem(staff.id, offeringId, item.id, { released });
      notify();
      return back("notice", released ? `${item.name} is released. Students can see their marks.` : `${item.name} is unreleased: students see it as "Not released" again.`);
    }
    case "update": {
      const parsed = parseItem(form);
      if (!parsed.ok) return back("error", parsed.error, "#item-details");
      updateItem(staff.id, offeringId, item.id, parsed.value);
      notify();
      return back("notice", `Saved ${parsed.value.name}.`);
    }
    case "delete": {
      deleteItem(staff.id, offeringId, item.id);
      notify();
      return redirect(withMessage(`/staff/offerings/${offeringId}/#items`, "notice", `Deleted ${item.name} and its marks.`), 303);
    }
    default:
      return back("error", "Something went wrong with that form. Try again.");
  }
};
