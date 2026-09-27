import type { APIRoute } from "astro";
import { startSession } from "../../lib/auth/session";
import { authenticate } from "../../lib/data";
import { safeNext, withMessage } from "../../lib/forms";

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const next = safeNext(form.get("next"), "/");
  const student = authenticate(String(form.get("uniId") ?? ""), String(form.get("password") ?? ""));
  if (!student) {
    const back = `/login/?next=${encodeURIComponent(next)}`;
    return redirect(withMessage(back, "error", "That uni ID and password don't match."), 303);
  }
  startSession(cookies, student.id, url.protocol === "https:");
  return redirect(next, 303);
};
