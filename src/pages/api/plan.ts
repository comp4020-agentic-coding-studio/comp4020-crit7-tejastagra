import type { APIRoute } from "astro";
import { updatePlan } from "../../lib/data";
import { notifyStudentChanged } from "../../lib/events";
import { number, withMessage } from "../../lib/forms";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const student = locals.student!;
  const form = await request.formData();
  const fail = (message: string) => redirect(withMessage("/planner/", "error", message), 303);

  const target = number(form, "targetGpa", "Target GPA", { min: 0, max: 7, optional: true });
  if (!target.ok) return fail(target.error);
  const degree = number(form, "degreeUnits", "Degree units", { min: 6, max: 600 });
  if (!degree.ok) return fail(degree.error);

  updatePlan(student.id, { targetGpa: target.value, degreeUnits: Math.round(degree.value!) });
  notifyStudentChanged(student.id);
  return redirect(withMessage("/planner/", "notice", "Plan saved."), 303);
};
