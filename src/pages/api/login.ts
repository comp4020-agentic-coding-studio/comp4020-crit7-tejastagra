import type { APIRoute } from "astro";
import { startSession } from "../../lib/auth/session";
import { authenticate } from "../../lib/data";
import { safeNext, withMessage } from "../../lib/forms";

// One login for everyone (docs/harness/visual-design.md): the account's role
// decides where it lands. A `next` from the other side's pages is ignored,
// so a staff member never lands on a student page or the reverse.
export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const next = safeNext(form.get("next"), "");
  const user = authenticate(String(form.get("uniId") ?? ""), String(form.get("password") ?? ""));
  if (!user) {
    const back = next ? `/login/?next=${encodeURIComponent(next)}` : "/login/";
    return redirect(withMessage(back, "error", "That uni ID and password don't match."), 303);
  }
  startSession(cookies, user.id, url.protocol === "https:");
  const staffPath = next.startsWith("/staff");
  if (user.role === "staff") return redirect(staffPath ? next : "/staff/", 303);
  return redirect(next && !staffPath ? next : "/", 303);
};
