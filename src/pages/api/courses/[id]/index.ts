import type { APIRoute } from "astro";
import { getStudentCourse, setTargetMark } from "../../../../lib/data";
import { notifyChanged } from "../../../../lib/events";
import { number, withMessage } from "../../../../lib/forms";

// The only thing a student can change about a course: their own target
// mark. Results themselves are staff-only (docs/harness/architecture.md).
export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const student = locals.user!;
  const enrolmentId = Number(params.id);
  if (!getStudentCourse(student.uniId, enrolmentId)) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const back = (kind: "error" | "notice", message: string) =>
    redirect(withMessage(`/courses/${enrolmentId}/#target`, kind, message), 303);
  if (form.get("_action") !== "target") return new Response("Not allowed", { status: 403 });

  const custom = number(form, "customTarget", "Target mark", { min: 0, max: 100, optional: true });
  if (!custom.ok) return back("error", custom.error);
  const preset = number(form, "target", "Target", { min: 0, max: 100, optional: true });
  if (!preset.ok) return back("error", preset.error);
  const target = custom.value ?? preset.value;
  setTargetMark(student.uniId, enrolmentId, target);
  notifyChanged([student.uniId]);
  return back("notice", target === null ? "Target cleared." : "Target saved.");
};
