import type { APIRoute } from "astro";
import { parseAssessment, parseCourse } from "../../../../lib/course-form";
import { addAssessment, deleteCourse, getCourse, setTargetMark, updateCourse } from "../../../../lib/data";
import { notifyStudentChanged } from "../../../../lib/events";
import { number, withMessage } from "../../../../lib/forms";

// One endpoint per course; the form's `_action` says what to do. Every call
// passes the logged-in student's id, so another student's course 404s.
export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const student = locals.student!;
  const courseId = Number(params.id);
  const course = getCourse(student.id, courseId);
  if (!course) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const page = `/courses/${courseId}/`;
  const back = (kind: "error" | "notice", message: string, hash = "") =>
    redirect(withMessage(page + hash, kind, message), 303);

  switch (String(form.get("_action"))) {
    case "target": {
      const custom = number(form, "customTarget", "Target mark", { min: 0, max: 100, optional: true });
      if (!custom.ok) return back("error", custom.error, "#target");
      const preset = number(form, "target", "Target", { min: 0, max: 100, optional: true });
      if (!preset.ok) return back("error", preset.error, "#target");
      const target = custom.value ?? preset.value;
      setTargetMark(student.id, courseId, target);
      notifyStudentChanged(student.id);
      return back("notice", target === null ? "Target cleared." : "Target saved.", "#target");
    }
    case "add-assessment": {
      const parsed = parseAssessment(form);
      if (!parsed.ok) return back("error", parsed.error, "#add-assessment");
      addAssessment(student.id, courseId, parsed.value);
      notifyStudentChanged(student.id);
      return back("notice", `Added ${parsed.value.name}.`, "#assessments");
    }
    case "update": {
      const parsed = parseCourse(form);
      if (!parsed.ok) return back("error", parsed.error, "#details");
      updateCourse(student.id, courseId, parsed.value);
      notifyStudentChanged(student.id);
      return back("notice", "Course details saved.");
    }
    case "delete": {
      deleteCourse(student.id, courseId);
      notifyStudentChanged(student.id);
      return redirect(withMessage("/archive/", "notice", `Deleted ${course.code}.`), 303);
    }
    default:
      return back("error", "Something went wrong with that form. Try again.");
  }
};
