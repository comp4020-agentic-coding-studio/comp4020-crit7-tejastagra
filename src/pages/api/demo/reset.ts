import type { APIRoute } from "astro";
import { DEMO_STUDENT, isDemoAccount, resetDemoData } from "../../../lib/data";
import { notifyChanged } from "../../../lib/events";
import { withMessage } from "../../../lib/forms";

// The demo accounts are shared by every visitor, so either of them can put
// the demo world back to how it started. No other account can.
export const POST: APIRoute = ({ locals, redirect }) => {
  const user = locals.user!;
  if (!isDemoAccount(user.uniId)) return new Response("Only the demo accounts can reset", { status: 403 });
  resetDemoData();
  notifyChanged([user.uniId, DEMO_STUDENT.uniId]);
  const home = user.role === "staff" ? "/staff/" : "/";
  return redirect(withMessage(home, "notice", "The demo data is back to how it started."), 303);
};
