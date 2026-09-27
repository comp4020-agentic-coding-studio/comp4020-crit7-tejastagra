import type { APIRoute } from "astro";
import { parseAssessment, parseScore } from "../../../../../lib/course-form";
import { deleteAssessment, getCourse, updateAssessment } from "../../../../../lib/data";
import { notifyStudentChanged } from "../../../../../lib/events";
import { withMessage } from "../../../../../lib/forms";

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const student = locals.student!;
  const courseId = Number(params.id);
  const course = getCourse(student.id, courseId);
  const item = course?.assessments.find((a) => a.id === Number(params.aid));
  if (!course || !item) return new Response("Not found", { status: 404 });

  const form = await request.formData();
  const back = (kind: "error" | "notice", message: string) =>
    redirect(withMessage(`/courses/${courseId}/#assessment-${item.id}`, kind, message), 303);

  switch (String(form.get("_action"))) {
    case "score": {
      // the quick path: just the mark, from the card's inline form
      const score = parseScore(form, item.outOf);
      if (!score.ok) return back("error", score.error);
      updateAssessment(student.id, courseId, item.id, { ...item, score: score.value });
      notifyStudentChanged(student.id);
      return back("notice", score.value === null ? `Cleared the mark for ${item.name}.` : `Saved your mark for ${item.name}.`);
    }
    case "update": {
      const parsed = parseAssessment(form);
      if (!parsed.ok) return back("error", parsed.error);
      updateAssessment(student.id, courseId, item.id, parsed.value);
      notifyStudentChanged(student.id);
      return back("notice", `Saved ${parsed.value.name}.`);
    }
    case "delete": {
      deleteAssessment(student.id, courseId, item.id);
      notifyStudentChanged(student.id);
      return redirect(withMessage(`/courses/${courseId}/#assessments`, "notice", `Removed ${item.name}.`), 303);
    }
    default:
      return back("error", "Something went wrong with that form. Try again.");
  }
};
