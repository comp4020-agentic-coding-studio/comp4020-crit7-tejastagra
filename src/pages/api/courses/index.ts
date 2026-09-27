import type { APIRoute } from "astro";
import { parseCourse } from "../../../lib/course-form";
import { createCourse } from "../../../lib/data";
import { notifyStudentChanged } from "../../../lib/events";
import { withMessage } from "../../../lib/forms";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const student = locals.student!;
  const parsed = parseCourse(await request.formData());
  if (!parsed.ok) return redirect(withMessage("/courses/new/", "error", parsed.error), 303);
  const course = createCourse(student.id, parsed.value);
  notifyStudentChanged(student.id);
  const next = `/courses/${course.id}/`;
  return redirect(withMessage(next, "notice", `Added ${course.code}. Now add its assessments.`), 303);
};
