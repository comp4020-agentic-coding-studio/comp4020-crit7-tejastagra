import type { APIRoute } from "astro";
import { DEMO_UNI_ID, resetDemoStudent } from "../../../lib/data";
import { notifyStudentChanged } from "../../../lib/events";
import { withMessage } from "../../../lib/forms";

// The demo account is shared by every visitor, so anyone logged into it can
// put it back to the seeded history. Only the demo account can be reset.
export const POST: APIRoute = ({ locals, redirect }) => {
  const student = locals.student!;
  if (student.uniId !== DEMO_UNI_ID) return new Response("Only the demo account can be reset", { status: 403 });
  resetDemoStudent(student.id);
  notifyStudentChanged(student.id);
  return redirect(withMessage("/", "notice", "The demo account is back to its starting history."), 303);
};
