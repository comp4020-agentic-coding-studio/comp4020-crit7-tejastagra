import type { APIRoute } from "astro";
import { startSession } from "../../lib/auth/session";
import { authenticate } from "../../lib/data";
import { safeNext, withMessage } from "../../lib/forms";

// One endpoint for both login pages. The form says which portal it came
// from, so a staff account on the student page (or the reverse) gets
// pointed to the right one instead of landing somewhere surprising.
export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const portal = form.get("portal") === "staff" ? "staff" : "student";
  const loginPage = portal === "staff" ? "/staff/login/" : "/login/";
  const next = safeNext(form.get("next"), portal === "staff" ? "/staff/" : "/");
  const back = (message: string) =>
    redirect(withMessage(`${loginPage}?next=${encodeURIComponent(next)}`, "error", message), 303);

  const user = authenticate(String(form.get("uniId") ?? ""), String(form.get("password") ?? ""));
  if (!user) return back("That uni ID and password don't match.");
  if (user.role !== portal) {
    return back(
      user.role === "staff"
        ? "That's a staff account. Use the staff login."
        : "That's a student account. Use the student login.",
    );
  }
  startSession(cookies, user.id, url.protocol === "https:");
  return redirect(next, 303);
};
